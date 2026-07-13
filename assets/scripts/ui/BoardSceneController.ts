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
  tween,
  UITransform,
  Vec2,
  Vec3,
  view
} from 'cc';
import { storeBoardItemInBackpack, takeBackpackItemToBoard } from '../core/backpack';
import {
  hasAvailableBoardCell,
  moveBackpack,
  moveBoardItem,
  spawnBasicItem,
  tryMerge
} from '../core/board';
import type { DisplacedItem } from '../core/board';
import { getFoodHealingValue } from '../core/customerHealing';
import { createInitialGameState } from '../core/gameState';
import { createOrderQueue } from '../core/orders';
import { deserializeSave, serializeSave } from '../core/save';
import { claimStaminaAd, recoverStamina, spendStamina } from '../core/stamina';
import type { CustomerHealingConfig, GameState, ItemConfig, ItemId, OrderConfig } from '../core/types';
import { addButton, addPanel, addText } from './UiKit';
import { StatusBarView } from './StatusBarView';

const { ccclass } = _decorator;
const saveKey = 'niangao-shisi-save';
const selectedBorderColor = new Color(255, 239, 152);

const emptyHealingConfig: CustomerHealingConfig = {
  levelRequirements: [100, 220, 400, 650, 1000, 1500, 2200, 3100, 4200],
  customers: {}
};

@ccclass('BoardSceneController')
export class BoardSceneController extends Component {
  private state: GameState = createInitialGameState();
  private orderConfigs: OrderConfig[] = [];
  private itemConfigs: ItemConfig[] = [];
  private healingConfig: CustomerHealingConfig = emptyHealingConfig;
  private statusBar: StatusBarView | null = null;
  private readonly cellPositions: Vec3[] = [];
  private contentRoot: Node | null = null;
  private boardFrame: Node | null = null;
  private boardObjects: Node | null = null;
  private backpackNode: Node | null = null;
  private backpackModal: Node | null = null;
  private selectionInfo: Node | null = null;
  private selectedCellIndex = -1;
  private prepStationNode: Node | null = null;
  private backpackStartTouch = new Vec2();
  private backpackStartPosition = new Vec3();
  private backpackDragging = false;
  private draggedItemNode: Node | null = null;
  private draggedItemIndex = -1;
  private itemStartTouch = new Vec2();
  private itemStartPosition = new Vec3();
  private itemDragging = false;
  private prepStationStartTouch = new Vec2();
  private prepStationStartPosition = new Vec3();
  private prepStationDragging = false;

  onLoad(): void {
    view.setDesignResolutionSize(750, 1334, ResolutionPolicy.FIXED_WIDTH);
    void this.initializeScene();
  }

  returnHomeScene(): void {
    this.persistState();
    director.loadScene('Home');
  }

  onDestroy(): void {
    this.persistState();
  }

  private async initializeScene(): Promise<void> {
    try {
      [this.orderConfigs, this.itemConfigs] = await Promise.all([
        this.loadJson<OrderConfig[]>('config/orders'),
        this.loadJson<ItemConfig[]>('config/items')
      ]);
      this.healingConfig = await this.loadJson<CustomerHealingConfig>('config/customer_healing');
      this.restoreState();
      this.state = recoverStamina(this.state);
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
    this.state = recoverStamina(this.state);
    sys.localStorage.setItem(saveKey, serializeSave(this.state));
  }

  private buildScene(): void {
    const root = new Node('BoardContent');
    this.node.addChild(root);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);
    this.contentRoot = root;

    addPanel(root, 'PaperBackground', 0, 0, 750, 1334, new Color(247, 232, 197), undefined, 0);
    this.statusBar = root.addComponent(StatusBarView);
    this.renderStatusBar();
    this.schedule(this.refreshStamina, 1);
    addText(root, 'BoardTitle', '今日营业', 0, 500, 300, 54, 32, new Color(91, 64, 55));

    this.buildOrders(root);
    this.buildBoard(root);

    addButton(root, 'HomeButton', '返回食肆', -285, -570, 160, 68, new Color(102, 145, 190), () => this.returnHomeScene());
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
      const itemName = order.requiredItemId === 'any_level_3'
        ? '任意三级菜品'
        : itemsById.get(order.requiredItemId)?.name ?? order.requiredItemId;
      const healing = order.requiredItemId === 'any_level_3'
        ? 0
        : getFoodHealingValue(order.customerType, order.requiredItemId, this.healingConfig);
      addText(card, 'OrderItemText', `需要：${itemName}`, 0, 22, 180, 30, 19, new Color(176, 82, 67));
      addText(card, 'CoinRewardText', `金币 +${order.rewards.coins}`, -48, -20, 90, 30, 16, new Color(177, 118, 37));
      addText(card, 'HealingRewardText', `治愈 +${healing}`, 52, -20, 100, 30, 16, new Color(200, 86, 92));
    });
  }

  private refreshStamina(): void {
    this.state = recoverStamina(this.state);
    this.renderStatusBar();
  }

  private renderStatusBar(): void {
    this.statusBar?.render(this.state, () => this.claimStaminaAd());
  }

  private claimStaminaAd(): void {
    this.state = recoverStamina(this.state);
    const result = claimStaminaAd(this.state);
    if (!result.granted) return;
    this.state = result.state;
    this.persistState();
    this.renderStatusBar();
  }

  private buildBoard(root: Node): void {
    const cellSize = 90;
    const gap = 4;
    const padding = 10;
    const totalWidth = cellSize * 7 + gap * 6;
    const totalHeight = cellSize * 9 + gap * 8;

    // 框的尺寸跟着格子算，四边留一样宽的边，写死尺寸会让左右边框比上下粗一截。
    const frame = addPanel(
      root,
      'BoardFrame',
      0,
      -90,
      totalWidth + padding * 2,
      totalHeight + padding * 2,
      new Color(239, 221, 193),
      undefined,
      8
    );
    this.boardFrame = frame;
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
          new Color(255, 249, 233),
          undefined,
          6
        );
      }
    }

    this.renderBoardObjects();
  }

  private renderBoardObjects(): void {
    if (!this.boardFrame) return;

    this.boardObjects?.destroy();
    const objects = new Node('BoardObjects');
    this.boardFrame.addChild(objects);
    objects.layer = this.boardFrame.layer;
    this.boardObjects = objects;
    this.backpackNode = null;
    this.prepStationNode = null;

    this.state.board.forEach((cell) => {
      if (!cell.itemId || cell.index === this.state.backpackCellIndex || cell.index === this.state.prepStationCellIndex) return;
      this.buildItem(objects, cell.index, cell.itemId);
    });
    this.buildPrepStation(objects);
    this.buildBackpack(objects);
    this.renderSelectionInfo();
  }

  private buildItem(parent: Node, cellIndex: number, itemId: ItemId): void {
    const item = this.itemConfigs.find((entry) => entry.id === itemId);
    const position = this.cellPositions[cellIndex];
    if (!item || !position) return;

    const itemNode = addPanel(
      parent,
      `Item${cellIndex}`,
      position.x,
      position.y,
      82,
      82,
      this.getItemColor(item.chain),
      this.selectedCellIndex === cellIndex ? selectedBorderColor : undefined,
      14
    );
    addText(itemNode, 'ItemName', item.name, 0, 0, 72, 58, 18, new Color(91, 64, 55));
    itemNode.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onItemTouchStart(itemNode, cellIndex, event));
    itemNode.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onItemTouchMove(itemNode, event));
    itemNode.on(Node.EventType.TOUCH_END, () => this.onItemTouchEnd(itemNode, cellIndex));
    itemNode.on(Node.EventType.TOUCH_CANCEL, () => this.onItemTouchEnd(itemNode, cellIndex));
  }

  private getItemColor(chain: ItemConfig['chain']): Color {
    if (chain === 'tea') return new Color(161, 211, 185);
    if (chain === 'sweet_potato') return new Color(241, 178, 132);
    return new Color(248, 218, 132);
  }

  private buildPrepStation(parent: Node): void {
    const position = this.cellPositions[this.state.prepStationCellIndex];
    if (!position) return;

    const prepStation = addPanel(
      parent,
      'PrepStation',
      position.x,
      position.y,
      82,
      82,
      new Color(242, 183, 72),
      this.selectedCellIndex === this.state.prepStationCellIndex ? selectedBorderColor : new Color(190, 129, 49),
      14
    );
    addText(prepStation, 'PrepStationLabel', '备料台\n-1体力', 0, 0, 74, 62, 17, new Color(91, 64, 55));
    prepStation.on(Node.EventType.TOUCH_START, this.onPrepStationTouchStart, this);
    prepStation.on(Node.EventType.TOUCH_MOVE, this.onPrepStationTouchMove, this);
    prepStation.on(Node.EventType.TOUCH_END, this.onPrepStationTouchEnd, this);
    prepStation.on(Node.EventType.TOUCH_CANCEL, this.onPrepStationTouchEnd, this);
    this.prepStationNode = prepStation;
  }

  private buildBackpack(frame: Node): void {
    const position = this.cellPositions[this.state.backpackCellIndex];
    const backpack = addPanel(
      frame,
      'BoardBackpack',
      position.x,
      position.y,
      82,
      82,
      new Color(91, 166, 126),
      this.selectedCellIndex === this.state.backpackCellIndex ? selectedBorderColor : new Color(64, 112, 86),
      6
    );
    addText(backpack, 'BackpackLabel', '背包', 0, 0, 74, 58, 24, new Color(255, 252, 240));
    backpack.on(Node.EventType.TOUCH_START, this.onBackpackTouchStart, this);
    backpack.on(Node.EventType.TOUCH_MOVE, this.onBackpackTouchMove, this);
    backpack.on(Node.EventType.TOUCH_END, this.onBackpackTouchEnd, this);
    backpack.on(Node.EventType.TOUCH_CANCEL, this.onBackpackTouchEnd, this);
    this.backpackNode = backpack;
  }

  /** 点一下选中并亮出信息条，再点一下才触发这一格自己的动作。 */
  private toggleSelection(cellIndex: number, activate: () => void): void {
    if (this.selectedCellIndex === cellIndex) {
      activate();
      return;
    }
    this.selectedCellIndex = cellIndex;
    this.renderBoardObjects();
  }

  private clearSelection(): void {
    if (this.selectedCellIndex === -1) return;
    this.selectedCellIndex = -1;
    this.renderBoardObjects();
  }

  private renderSelectionInfo(): void {
    this.selectionInfo?.destroy();
    this.selectionInfo = null;

    const selection = this.describeSelection();
    if (!selection || !this.contentRoot) return;

    // 占据返回按钮右边那片空地，棋盘一格不让。
    const card = addPanel(
      this.contentRoot,
      'SelectionInfo',
      90,
      -570,
      540,
      68,
      new Color(255, 249, 233),
      new Color(190, 129, 49),
      12
    );
    card.setSiblingIndex(this.contentRoot.children.length - 1);
    this.selectionInfo = card;

    addText(card, 'SelectionName', selection.name, -180, 16, 200, 30, 21, new Color(91, 64, 55));
    addText(card, 'SelectionLevel', selection.level, 190, 16, 140, 30, 16, new Color(174, 112, 63));
    addText(card, 'SelectionDescription', selection.description, 0, -16, 500, 28, 15, new Color(139, 111, 92));
  }

  private describeSelection(): { name: string; level: string; description: string } | null {
    if (this.selectedCellIndex === -1) return null;

    if (this.selectedCellIndex === this.state.backpackCellIndex) {
      return {
        name: '背包',
        level: `${this.state.backpackItemIds.length} / ${this.state.backpackCapacity}`,
        description: '再点一下打开，看看存了些什么。'
      };
    }

    if (this.selectedCellIndex === this.state.prepStationCellIndex) {
      return {
        name: '备料台',
        level: '消耗 1 体力',
        description: '再点一下备料，随机产出一样一级食材。'
      };
    }

    const itemId = this.state.board[this.selectedCellIndex]?.itemId;
    const item = this.itemConfigs.find((entry) => entry.id === itemId);
    if (!item) return null;

    return {
      name: item.name,
      level: `${item.level} 级`,
      description: item.description
    };
  }

  private generateFromPrepStation(): void {
    const reservedIndexes = [this.state.backpackCellIndex, this.state.prepStationCellIndex];
    if (!hasAvailableBoardCell(this.state.board, reservedIndexes)) {
      this.showBoardNotice('棋盘没有空位');
      return;
    }

    const result = spendStamina(this.state, 1);
    if (!result.spent) {
      this.showBoardNotice('体力不足');
      return;
    }

    const basicItems = this.itemConfigs.filter((item) => item.level === 1);
    const item = basicItems[Math.floor(Math.random() * basicItems.length)];
    if (!item) return;

    this.state = {
      ...result.state,
      board: spawnBasicItem(result.state.board, item.id, reservedIndexes)
    };
    this.persistState();
    this.renderStatusBar();
    this.renderBoardObjects();
    this.showBoardNotice(`获得：${item.name}`);
  }

  private onPrepStationTouchStart(event: EventTouch): void {
    const location = event.getUILocation();
    this.prepStationStartTouch.set(location.x, location.y);
    this.prepStationStartPosition.set(this.prepStationNode?.position ?? Vec3.ZERO);
    this.prepStationDragging = false;
    this.prepStationNode?.setSiblingIndex(this.boardObjects?.children.length ?? 0);
  }

  private onPrepStationTouchMove(event: EventTouch): void {
    if (!this.prepStationNode) return;

    const location = event.getUILocation();
    const deltaX = location.x - this.prepStationStartTouch.x;
    const deltaY = location.y - this.prepStationStartTouch.y;
    if (Math.hypot(deltaX, deltaY) > 10) this.prepStationDragging = true;
    if (this.prepStationDragging) {
      this.prepStationNode.setPosition(
        this.prepStationStartPosition.x + deltaX,
        this.prepStationStartPosition.y + deltaY
      );
    }
  }

  private onPrepStationTouchEnd(): void {
    if (!this.prepStationNode) return;

    if (!this.prepStationDragging) {
      this.toggleSelection(this.state.prepStationCellIndex, () => this.generateFromPrepStation());
      return;
    }

    const targetIndex = this.findClosestCellIndex(this.prepStationNode.position);
    if (targetIndex === this.state.backpackCellIndex) {
      this.snapPrepStationToCell();
      this.showBoardNotice('背包占用此格');
      return;
    }

    const result = moveBackpack(this.state.board, this.state.prepStationCellIndex, targetIndex, [
      this.state.backpackCellIndex
    ]);
    if (result.moved) {
      this.state.board = result.board;
      this.state.prepStationCellIndex = result.backpackCellIndex;
      this.persistState();
      this.renderBoardObjects();
      if (result.displaced) this.animateDisplacement(result.displaced);
      return;
    }
    this.snapPrepStationToCell();
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
    if (Math.hypot(deltaX, deltaY) > 10) {
      this.backpackDragging = true;
      this.selectedCellIndex = -1;
    }

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
      this.toggleSelection(this.state.backpackCellIndex, () => this.openBackpackModal());
      return;
    }

    const targetIndex = this.findClosestCellIndex(this.backpackNode.position);
    if (targetIndex === this.state.prepStationCellIndex) {
      this.snapBackpackToCell();
      this.showBoardNotice('备料台占用此格');
      return;
    }
    const result = moveBackpack(this.state.board, this.state.backpackCellIndex, targetIndex, [
      this.state.prepStationCellIndex
    ]);
    if (result.moved) {
      this.state.board = result.board;
      this.state.backpackCellIndex = result.backpackCellIndex;
      this.persistState();
      this.renderBoardObjects();
      if (result.displaced) this.animateDisplacement(result.displaced);
      return;
    }
    this.snapBackpackToCell();
  }

  private onItemTouchStart(itemNode: Node, cellIndex: number, event: EventTouch): void {
    const location = event.getUILocation();
    this.draggedItemNode = itemNode;
    this.draggedItemIndex = cellIndex;
    this.itemStartTouch.set(location.x, location.y);
    this.itemStartPosition.set(itemNode.position);
    this.itemDragging = false;
    itemNode.setSiblingIndex(this.boardObjects?.children.length ?? 0);
  }

  private onItemTouchMove(itemNode: Node, event: EventTouch): void {
    if (this.draggedItemNode !== itemNode) return;

    const location = event.getUILocation();
    const deltaX = location.x - this.itemStartTouch.x;
    const deltaY = location.y - this.itemStartTouch.y;
    if (Math.hypot(deltaX, deltaY) > 10) {
      this.itemDragging = true;
      // 拖动中不能重建棋盘，否则手上这个节点会被销毁；等落子时统一重绘。
      this.selectedCellIndex = -1;
    }
    if (this.itemDragging) {
      itemNode.setPosition(this.itemStartPosition.x + deltaX, this.itemStartPosition.y + deltaY);
    }
  }

  private onItemTouchEnd(itemNode: Node, cellIndex: number): void {
    if (this.draggedItemNode !== itemNode) return;

    const wasDragging = this.itemDragging;
    this.draggedItemNode = null;
    this.draggedItemIndex = -1;
    this.itemDragging = false;
    if (!wasDragging) {
      this.toggleSelection(cellIndex, () => this.clearSelection());
      return;
    }

    const targetIndex = this.findClosestCellIndex(itemNode.position);
    if (targetIndex === this.state.backpackCellIndex) {
      const result = storeBoardItemInBackpack(this.state, cellIndex);
      if (result.stored) {
        this.state = result.state;
        this.persistState();
        this.renderBoardObjects();
        this.showBoardNotice('已放入背包');
      } else {
        this.renderBoardObjects();
        this.showBoardNotice('背包已满');
      }
      return;
    }
    if (targetIndex !== cellIndex) {
      const result = tryMerge(this.state.board, cellIndex, targetIndex, this.itemConfigs);
      if (result.merged) {
        this.state.board = result.board;
        this.persistState();
        this.renderBoardObjects();
        const upgradedItem = this.itemConfigs.find((item) => item.id === result.board[targetIndex].itemId);
        this.showBoardNotice(`合成：${upgradedItem?.name ?? '新食材'}`);
        return;
      }
      if (targetIndex !== this.state.prepStationCellIndex) {
        const moved = moveBoardItem(this.state.board, cellIndex, targetIndex, [
          this.state.backpackCellIndex,
          this.state.prepStationCellIndex
        ]);
        if (moved.moved) {
          this.state.board = moved.board;
          this.persistState();
          this.renderBoardObjects();
          if (moved.displaced) {
            this.animateDisplacement(moved.displaced);
            this.animateSettle(targetIndex);
          }
          return;
        }
      }
    }
    this.renderBoardObjects();
  }

  private animateDisplacement(displaced: DisplacedItem): void {
    const node = this.boardObjects?.getChildByName(`Item${displaced.toIndex}`);
    const from = this.cellPositions[displaced.fromIndex];
    const to = this.cellPositions[displaced.toIndex];
    if (!node || !from || !to) return;

    node.setPosition(from.x, from.y);
    node.setScale(1.18, 0.82, 1);
    tween(node).to(0.28, { position: new Vec3(to.x, to.y, 0) }, { easing: 'backOut' }).start();
    tween(node)
      .to(0.14, { scale: new Vec3(0.88, 1.12, 1) }, { easing: 'quadOut' })
      .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  private animateSettle(cellIndex: number): void {
    const node = this.boardObjects?.getChildByName(`Item${cellIndex}`);
    if (!node) return;

    node.setScale(1.16, 1.16, 1);
    tween(node).to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
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

    return closestIndex;
  }

  private snapBackpackToCell(): void {
    const position = this.cellPositions[this.state.backpackCellIndex];
    if (position) this.backpackNode?.setPosition(position);
  }

  private snapPrepStationToCell(): void {
    const position = this.cellPositions[this.state.prepStationCellIndex];
    if (position) this.prepStationNode?.setPosition(position);
  }

  private openBackpackModal(): void {
    if (this.backpackModal) return;

    this.clearSelection();
    const overlay = addPanel(this.node, 'BackpackModal', 0, 0, 750, 1334, new Color(48, 42, 39, 190), undefined, 0);
    overlay.setSiblingIndex(this.node.children.length - 1);
    this.backpackModal = overlay;

    const panel = addPanel(overlay, 'BackpackPanel', 0, 20, 650, 850, new Color(242, 232, 205), new Color(88, 130, 170), 14);
    addText(panel, 'BackpackTitle', '背包', 0, 365, 300, 56, 38, new Color(91, 64, 55));
    addText(
      panel,
      'BackpackCapacity',
      `${this.state.backpackItemIds.length} / ${this.state.backpackCapacity}`,
      0,
      310,
      240,
      38,
      24,
      new Color(174, 112, 63)
    );
    addText(panel, 'BackpackHint', '点一下取出，放回棋盘。', 0, 262, 400, 34, 18, new Color(139, 111, 92));

    const columns = 5;
    const cellSize = 104;
    const gap = 14;
    const startX = -((columns - 1) * (cellSize + gap)) / 2;
    const startY = 185;
    for (let index = 0; index < this.state.backpackCapacity; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cell = addPanel(
        panel,
        `BackpackSlot${index}`,
        startX + column * (cellSize + gap),
        startY - row * (cellSize + gap),
        cellSize,
        cellSize,
        new Color(255, 244, 215),
        undefined,
        12
      );
      const itemId = this.state.backpackItemIds[index];
      if (!itemId) continue;
      const item = this.itemConfigs.find((entry) => entry.id === itemId);
      if (!item) continue;
      addPanel(cell, 'StoredItemColor', 0, 13, 64, 34, this.getItemColor(item.chain), undefined, 10);
      addText(cell, 'StoredItemName', item.name, 0, -22, 90, 42, 16, new Color(91, 64, 55));
      cell.on(Node.EventType.TOUCH_END, () => this.takeFromBackpack(index));
    }

    addButton(panel, 'CloseBackpackButton', '关闭', 0, -345, 150, 58, new Color(218, 91, 77), () => this.closeBackpackModal());
  }

  private takeFromBackpack(slotIndex: number): void {
    const result = takeBackpackItemToBoard(this.state, slotIndex);
    if (!result.taken) {
      this.showBoardNotice(result.reason === 'board_full' ? '棋盘没有空位' : '这个格子是空的');
      return;
    }

    const item = this.itemConfigs.find((entry) => entry.id === this.state.backpackItemIds[slotIndex]);
    this.state = result.state;
    this.persistState();
    this.closeBackpackModal();
    this.renderBoardObjects();
    this.animateSettle(result.cellIndex);
    this.showBoardNotice(`已取出：${item?.name ?? '食材'}`);
  }

  private closeBackpackModal(): void {
    this.backpackModal?.destroy();
    this.backpackModal = null;
  }

  private showBoardNotice(message: string): void {
    const existing = this.node.getChildByName('BackpackNotice');
    existing?.destroy();
    const label = addText(
      this.node,
      'BackpackNotice',
      message,
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
