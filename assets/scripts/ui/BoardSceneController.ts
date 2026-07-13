import {
  _decorator,
  Color,
  Component,
  director,
  EventTouch,
  JsonAsset,
  Node,
  ResolutionPolicy,
  resources,
  sys,
  UITransform,
  Vec2,
  Vec3,
  view
} from 'cc';
import { moveBackpack } from '../core/board';
import { getCustomerHealingProgress } from '../core/customerHealing';
import { createInitialGameState } from '../core/gameState';
import { createOrderQueue } from '../core/orders';
import { deserializeSave, serializeSave } from '../core/save';
import type { CustomerHealingConfig, GameState, ItemConfig, OrderConfig } from '../core/types';
import { addButton, addPanel, addText } from './UiKit';
import { StatusBarView } from './StatusBarView';

const { ccclass } = _decorator;
const saveKey = 'niangao-shisi-save';

const customerHealingLevels: CustomerHealingConfig = {
  levelRequirements: [100, 220, 400, 650, 1000, 1500, 2200, 3100, 4200],
  customers: {}
};

@ccclass('BoardSceneController')
export class BoardSceneController extends Component {
  private state: GameState = createInitialGameState();
  private orderConfigs: OrderConfig[] = [];
  private itemConfigs: ItemConfig[] = [];
  private readonly cellPositions: Vec3[] = [];
  private boardFrame: Node | null = null;
  private backpackNode: Node | null = null;
  private backpackStartTouch = new Vec2();
  private backpackStartPosition = new Vec3();
  private backpackDragging = false;

  onLoad(): void {
    view.setDesignResolutionSize(750, 1334, ResolutionPolicy.FIXED_WIDTH);
    void this.initializeScene();
  }

  returnHomeScene(): void {
    this.persistState();
    director.loadScene('Home');
  }

  private async initializeScene(): Promise<void> {
    try {
      [this.orderConfigs, this.itemConfigs] = await Promise.all([
        this.loadJson<OrderConfig[]>('config/orders'),
        this.loadJson<ItemConfig[]>('config/items')
      ]);
      this.restoreState();
      if (this.state.activeOrders.length === 0) {
        this.state.activeOrders = createOrderQueue(this.orderConfigs, this.state.unlocked);
        this.persistState();
      }
      this.buildScene();
    } catch (error) {
      console.error('Failed to initialize board orders', error);
    }
  }

  private loadJson<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
      resources.load(path, JsonAsset, (error, asset) => {
        if (error || !asset) {
          reject(error ?? new Error(`Missing resource: ${path}`));
          return;
        }
        resolve(asset.json as T);
      });
    });
  }

  private restoreState(): void {
    const saved = sys.localStorage.getItem(saveKey);
    if (!saved) return;

    try {
      this.state = deserializeSave(saved);
    } catch {
      sys.localStorage.removeItem(saveKey);
    }
  }

  private persistState(): void {
    sys.localStorage.setItem(saveKey, serializeSave(this.state));
  }

  private buildScene(): void {
    const root = new Node('BoardContent');
    this.node.addChild(root);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);

    addPanel(root, 'PaperBackground', 0, 0, 750, 1334, new Color(247, 232, 197), undefined, 0);
    root.addComponent(StatusBarView).render(this.state);
    addText(root, 'BoardTitle', '今日营业', 0, 500, 300, 54, 34, new Color(91, 64, 55));

    this.buildOrders(root);
    this.buildBoard(root);

    addButton(root, 'BasketButton', '食材篮', -205, -555, 170, 72, new Color(218, 91, 77), () => undefined);
    addButton(root, 'HomeButton', '返回食肆', 0, -555, 180, 72, new Color(102, 145, 190), () => this.returnHomeScene());
    addButton(root, 'MenuButton', '菜单', 205, -555, 170, 72, new Color(238, 174, 55), () => undefined);
  }

  private buildOrders(root: Node): void {
    const ordersById = new Map(this.orderConfigs.map((order) => [order.id, order]));
    const itemsById = new Map(this.itemConfigs.map((item) => [item.id, item]));
    const colors = [new Color(255, 248, 225), new Color(238, 246, 232), new Color(247, 226, 220)];

    this.state.activeOrders.forEach((activeOrder, index) => {
      const order = ordersById.get(activeOrder.orderId);
      if (!order) return;
      const card = addPanel(
        root,
        `OrderCard${index + 1}`,
        -235 + index * 235,
        414,
        210,
        104,
        colors[index % colors.length],
        new Color(119, 83, 65),
        8
      );
      const level = getCustomerHealingProgress(this.state.customerHealingByType[order.customerType], customerHealingLevels).level;
      const itemName = order.requiredItemId === 'any_level_3'
        ? '任意三级菜品'
        : itemsById.get(order.requiredItemId)?.name ?? order.requiredItemId;
      addText(card, 'CustomerText', `${order.customerName}  Lv.${level}`, 0, 22, 190, 34, 20, new Color(91, 64, 55));
      addText(card, 'OrderItemText', `需要：${itemName}`, 0, -20, 180, 34, 20, new Color(176, 82, 67));
    });
  }

  private buildBoard(root: Node): void {
    const frame = addPanel(root, 'BoardFrame', 0, -22, 566, 720, new Color(222, 186, 132), new Color(104, 73, 62), 8);
    this.boardFrame = frame;
    const cellSize = 66;
    const gap = 6;
    const totalWidth = cellSize * 7 + gap * 6;
    const totalHeight = cellSize * 9 + gap * 8;
    const startX = -totalWidth / 2 + cellSize / 2;
    const startY = totalHeight / 2 - cellSize / 2;

    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const index = row * 7 + column;
        const position = new Vec3(
          startX + column * (cellSize + gap),
          startY - row * (cellSize + gap)
        );
        this.cellPositions[index] = position;
        addPanel(
          frame,
          `BoardCell${index}`,
          position.x,
          position.y,
          cellSize,
          cellSize,
          new Color(255, 247, 224),
          new Color(192, 153, 107),
          6
        );
      }
    }

    this.buildBackpack(frame);
  }

  private buildBackpack(frame: Node): void {
    const position = this.cellPositions[this.state.backpackCellIndex];
    const backpack = addPanel(
      frame,
      'BoardBackpack',
      position.x,
      position.y,
      60,
      60,
      new Color(91, 166, 126),
      new Color(64, 112, 86),
      6
    );
    addText(backpack, 'BackpackLabel', '背包', 0, 0, 54, 44, 19, new Color(255, 252, 240));
    backpack.on(Node.EventType.TOUCH_START, this.onBackpackTouchStart, this);
    backpack.on(Node.EventType.TOUCH_MOVE, this.onBackpackTouchMove, this);
    backpack.on(Node.EventType.TOUCH_END, this.onBackpackTouchEnd, this);
    backpack.on(Node.EventType.TOUCH_CANCEL, this.onBackpackTouchEnd, this);
    this.backpackNode = backpack;
  }

  private onBackpackTouchStart(event: EventTouch): void {
    const location = event.getUILocation();
    this.backpackStartTouch.set(location.x, location.y);
    this.backpackStartPosition.set(this.backpackNode?.position ?? Vec3.ZERO);
    this.backpackDragging = false;
    this.backpackNode?.setSiblingIndex(this.boardFrame?.children.length ?? 0);
  }

  private onBackpackTouchMove(event: EventTouch): void {
    if (!this.backpackNode) return;

    const location = event.getUILocation();
    const deltaX = location.x - this.backpackStartTouch.x;
    const deltaY = location.y - this.backpackStartTouch.y;
    if (Math.hypot(deltaX, deltaY) > 10) this.backpackDragging = true;

    if (this.backpackDragging) {
      this.backpackNode.setPosition(
        this.backpackStartPosition.x + deltaX,
        this.backpackStartPosition.y + deltaY
      );
    }
  }

  private onBackpackTouchEnd(): void {
    if (!this.backpackNode) return;

    if (!this.backpackDragging) {
      this.showBackpackPlaceholder();
      this.snapBackpackToCell();
      return;
    }

    const targetIndex = this.findClosestCellIndex(this.backpackNode.position);
    const result = moveBackpack(this.state.board, this.state.backpackCellIndex, targetIndex);
    if (result.moved) this.state.backpackCellIndex = result.backpackCellIndex;
    this.snapBackpackToCell();
  }

  private findClosestCellIndex(position: Readonly<Vec3>): number {
    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.cellPositions.forEach((cellPosition, index) => {
      const distance = Vec3.squaredDistance(position, cellPosition);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestDistance <= 33 * 33 ? closestIndex : -1;
  }

  private snapBackpackToCell(): void {
    const position = this.cellPositions[this.state.backpackCellIndex];
    if (position) this.backpackNode?.setPosition(position);
  }

  private showBackpackPlaceholder(): void {
    const existing = this.node.getChildByName('BackpackNotice');
    existing?.destroy();
    const label = addText(
      this.node,
      'BackpackNotice',
      '背包功能开发中',
      0,
      -470,
      280,
      52,
      24,
      new Color(91, 64, 55)
    );
    label.node.setSiblingIndex(this.node.children.length - 1);
    this.scheduleOnce(() => {
      if (label.isValid) label.node.destroy();
    }, 1.2);
  }
}
