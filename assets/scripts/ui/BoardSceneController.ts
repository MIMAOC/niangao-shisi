import {
  _decorator,
  Button,
  Component,
  director,
  Node,
  ResolutionPolicy,
  Tween,
  UIOpacity,
  UITransform,
  Vec3,
  tween,
  view
} from 'cc';
import {
  PREP_STATION_ID,
  storeBoardItemInBackpack,
  storePrepStationInBackpack,
  takeBackpackItemToBoard
} from '../core/backpack';
import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  findAvailableBoardCellIndex,
  hasAvailableBoardCell,
  moveBoardItem,
  moveFixture,
  placeItemOnFixtureCell,
  spawnBasicItem,
  tryMerge
} from '../core/board';
import type { DisplacedItem } from '../core/board';
import { tryGetFoodHealingValue } from '../core/customerHealing';
import { createInitialGameState } from '../core/gameState';
import { rollBasicItem } from '../core/items';
import {
  completeOrder,
  createOrderQueue,
  getOrderBoardMatch,
  getOrderRequirements,
  replaceCompletedOrder
} from '../core/orders';
import { recoverStamina, claimStaminaAd, spendStamina } from '../core/stamina';
import type {
  ActiveOrder,
  CustomerHealingConfig,
  GameState,
  ItemConfig,
  ItemId,
  LevelConfig,
  OrderConfig
} from '../core/types';
import { makeDraggable } from './dragging';
import { loadGameState, loadJsonConfig, saveGameState } from './gameStore';
import { getItemColor, palette } from './theme';
import { addButton, addPanel, addText } from './UiKit';
import { StatusBarView } from './StatusBarView';

const { ccclass } = _decorator;

const CELL_SIZE = 90;
const CELL_GAP = 4;
const BOARD_PADDING = 10;
const ITEM_SIZE = 82;
/** 松手点离最近格子超过一格远，就当没落在棋盘上，弹回原位。 */
const DROP_MAX_DISTANCE = CELL_SIZE;
/** 选中底色淡入的时长；再长就拖沓了。 */
const SELECT_FADE_SECONDS = 0.16;
/** 松手后食材被「吸」进格子的时长。 */
const SNAP_SECONDS = 0.14;

/** 治愈配置没加载出来时的占位。真值全在 config/customer_healing.json 里，这里不留副本。 */
const EMPTY_HEALING_CONFIG: CustomerHealingConfig = Object.freeze({
  levelRequirements: [],
  customers: {}
});

@ccclass('BoardSceneController')
export class BoardSceneController extends Component {
  private state: GameState = createInitialGameState();
  private orderConfigs: OrderConfig[] = [];
  private itemConfigs: ItemConfig[] = [];
  private levelConfigs: LevelConfig[] = [];
  private healingConfig: CustomerHealingConfig = EMPTY_HEALING_CONFIG;
  private statusBar: StatusBarView | null = null;
  private readonly cellPositions: Vec3[] = [];
  private readonly cellHighlights: Node[] = [];
  /** 拖动中不点亮任何格子：食材已经不在格子里了，底色留在原地看着像还没拿起来。 */
  private dragging = false;
  private contentRoot: Node | null = null;
  private orderLayer: Node | null = null;
  private readonly readyOrderItemIndexes = new Set<number>();
  private boardFrame: Node | null = null;
  private boardObjects: Node | null = null;
  private backpackModal: Node | null = null;
  private selectionInfo: Node | null = null;
  private selectedCellIndex = -1;
  /** 交付中的食材节点住在这一层，棋盘重绘销毁不到它们。 */
  private flightLayer: Node | null = null;
  /** 只影响顶部数值什么时候去追新状态，状态本身早已结清。 */
  private pendingRewardReveal = false;
  private prepStationNode: Node | null = null;

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
      [this.orderConfigs, this.itemConfigs, this.healingConfig, this.levelConfigs] = await Promise.all([
        loadJsonConfig<OrderConfig[]>('config/orders'),
        loadJsonConfig<ItemConfig[]>('config/items'),
        loadJsonConfig<CustomerHealingConfig>('config/customer_healing'),
        loadJsonConfig<LevelConfig[]>('config/levels')
      ]);
    } catch (error) {
      console.error('Failed to load board configs', error);
      return;
    }

    this.state = recoverStamina(loadGameState());
    if (this.state.activeOrders.length === 0) {
      this.state = { ...this.state, activeOrders: this.createOrders() };
      this.persistState();
    }
    this.buildScene();
  }

  /** 订单池不够开一桌不该让整个场景打不开——先空着，让玩家至少能合成。 */
  private createOrders(): GameState['activeOrders'] {
    try {
      return createOrderQueue(this.orderConfigs, this.state.unlocked);
    } catch (error) {
      console.error('Failed to create the order queue', error);
      return [];
    }
  }

  private persistState(): void {
    this.state = recoverStamina(this.state);
    saveGameState(this.state);
  }

  private buildScene(): void {
    const root = new Node('BoardContent');
    this.node.addChild(root);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);
    this.contentRoot = root;

    addPanel(root, 'PaperBackground', 0, 0, 750, 1334, palette.paper, undefined, 0);
    this.statusBar = root.addComponent(StatusBarView);
    this.statusBar.setLevels(this.levelConfigs);
    this.renderStatusBar();
    this.schedule(this.refreshStamina, 1);
    addText(root, 'BoardTitle', '今日营业', 0, 500, 300, 54, 32, palette.ink);

    this.orderLayer = new Node('OrderLayer');
    root.addChild(this.orderLayer);
    this.orderLayer.layer = root.layer;
    this.buildOrders(this.orderLayer);
    this.buildBoard(root);

    // 建在棋盘之后，交付中的食材才会盖在棋盘上飞过去。
    this.flightLayer = new Node('FlightLayer');
    root.addChild(this.flightLayer);
    this.flightLayer.layer = root.layer;

    addButton(root, 'HomeButton', '返回食肆', -285, -570, 160, 68, palette.blue, () => this.returnHomeScene());
  }

  private buildOrders(root: Node): void {
    root.removeAllChildren();
    this.readyOrderItemIndexes.clear();
    const ordersById = new Map(this.orderConfigs.map((order) => [order.id, order]));
    const itemsById = new Map(this.itemConfigs.map((item) => [item.id, item]));

    this.state.activeOrders.forEach((activeOrder, index) => {
      const order = ordersById.get(activeOrder.orderId);
      if (!order) return;

      const card = addPanel(
        root,
        `OrderCard${index + 1}`,
        -235 + index * 235,
        414,
        210,
        120,
        palette.orderCards[index % palette.orderCards.length],
        palette.orderCardStroke,
        8
      );

      const match = getOrderBoardMatch(order, this.state.board, this.itemConfigs);
      match.requirements.forEach((requirement) => {
        requirement.highlightCellIndexes.forEach((cellIndex) => this.readyOrderItemIndexes.add(cellIndex));
      });
      const healing = this.getOrderHealingReward(order);
      // 每条需求单独画一行，备好的那行要能单独点亮，合成一整块文本就做不到。
      const lineHeight = 24;
      const topY = 26 + ((match.requirements.length - 1) * lineHeight) / 2;
      match.requirements.forEach((requirement, lineIndex) => {
        const itemName = requirement.requirement.itemId === 'any_level_3'
          ? '任意三级菜品'
          : itemsById.get(requirement.requirement.itemId)?.name ?? requirement.requirement.itemId;
        const progress = `${requirement.matchedCellIndexes.length}/${requirement.requirement.quantity}`;
        const lineY = topY - lineIndex * lineHeight;

        if (requirement.fulfilled) {
          addPanel(card, `OrderItemReady${lineIndex}`, -24, lineY, 152, 22, palette.orderReadyPill, undefined, 11);
        }
        addText(
          card,
          `OrderItemText${lineIndex}`,
          `${requirement.fulfilled ? '已备好' : '需要'}：${itemName} ${progress}`,
          -24,
          lineY,
          148,
          22,
          16,
          requirement.fulfilled ? palette.orderReady : palette.orderItemText
        );
      });
      addText(card, 'CoinRewardText', `金币 +${order.rewards.coins}`, -48, -31, 90, 28, 15, palette.coinRewardText);
      addText(
        card,
        'HealingRewardText',
        `治愈 +${healing ?? '—'}`,
        52,
        -31,
        100,
        28,
        15,
        palette.healingRewardText
      );

      if (match.complete) {
        addButton(card, 'SubmitOrderButton', '✓', 76, 29, 44, 36, palette.green, () => {
          this.submitOrder(activeOrder);
        });
      }
    });
  }

  private getOrderHealingReward(order: OrderConfig): number | null {
    const values = getOrderRequirements(order).map((requirement) => {
      if (requirement.itemId === 'any_level_3') return null;
      const healing = tryGetFoodHealingValue(order.customerType, requirement.itemId, this.healingConfig);
      return healing === null ? null : healing * requirement.quantity;
    });
    return values.some((value) => value === null)
      ? null
      : values.reduce((total, value) => total + (value ?? 0), 0);
  }

  private refreshStamina(): void {
    this.state = recoverStamina(this.state);
    // 交付动画期间这一秒一次的刷新会抢先把金币亮出来，等食材落到订单卡上再一起刷。
    if (this.pendingRewardReveal) return;
    this.renderStatusBar();
  }

  private renderStatusBar(): void {
    this.statusBar?.render(this.state, () => this.claimStaminaAd());
  }

  private claimStaminaAd(): void {
    const result = claimStaminaAd(recoverStamina(this.state));
    if (!result.granted) return;

    this.state = result.state;
    this.persistState();
    this.renderStatusBar();
  }

  private buildBoard(root: Node): void {
    const totalWidth = CELL_SIZE * BOARD_COLUMNS + CELL_GAP * (BOARD_COLUMNS - 1);
    const totalHeight = CELL_SIZE * BOARD_ROWS + CELL_GAP * (BOARD_ROWS - 1);

    // 框的尺寸跟着格子算，四边留一样宽的边，写死尺寸会让左右边框比上下粗一截。
    const frame = addPanel(
      root,
      'BoardFrame',
      0,
      -90,
      totalWidth + BOARD_PADDING * 2,
      totalHeight + BOARD_PADDING * 2,
      palette.boardFrame,
      undefined,
      8
    );
    this.boardFrame = frame;

    const startX = -totalWidth / 2 + CELL_SIZE / 2;
    const startY = totalHeight / 2 - CELL_SIZE / 2;
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let column = 0; column < BOARD_COLUMNS; column += 1) {
        const index = row * BOARD_COLUMNS + column;
        const position = new Vec3(
          startX + column * (CELL_SIZE + CELL_GAP),
          startY - row * (CELL_SIZE + CELL_GAP)
        );
        this.cellPositions[index] = position;
        const cell = addPanel(
          frame,
          `BoardCell${index}`,
          position.x,
          position.y,
          CELL_SIZE,
          CELL_SIZE,
          palette.boardCell,
          undefined,
          6
        );

        // 暖橙底常驻在每格里，平时透明度为 0。选中时淡入——Graphics 直接改色是瞬时的，做不出这个。
        const highlight = addPanel(cell, 'CellHighlight', 0, 0, CELL_SIZE, CELL_SIZE, palette.selected, undefined, 6);
        highlight.addComponent(UIOpacity).opacity = 0;
        this.cellHighlights[index] = highlight;
      }
    }

    this.renderBoardObjects();
  }

  /**
   * 选中的格子空了就取消选中。交付订单、放进背包都会把食材从格子里拿走，
   * 但它们只管改棋盘，不会回头看选中的是不是正好那一格——留下的就是一个亮着的空格子。
   * 拖动中不管：食材虽然在手上，棋盘数据里它还在原格，落子时才结算。
   */
  private normalizeSelection(): void {
    const index = this.selectedCellIndex;
    if (index === -1 || this.dragging) return;
    if (index === this.state.backpackCellIndex || index === this.state.prepStationCellIndex) return;

    if (!this.state.board[index]?.itemId) this.selectedCellIndex = -1;
  }

  /** 选中的那一格淡入暖橙底。食材（82）比格子（90）小一圈，四周会露出这层底。 */
  private updateCellHighlights(): void {
    this.cellHighlights.forEach((highlight, index) => {
      const opacity = highlight.getComponent(UIOpacity);
      if (!opacity) return;

      Tween.stopAllByTarget(opacity);
      if (this.dragging || index !== this.selectedCellIndex) {
        opacity.opacity = 0;
        return;
      }
      // 已经亮着就别再淡入一次：拖动中每次重绘都会走到这里。
      if (opacity.opacity === 255) return;
      tween(opacity).to(SELECT_FADE_SECONDS, { opacity: 255 }).start();
    });
  }

  private renderBoardObjects(): void {
    if (!this.boardFrame) return;

    this.normalizeSelection();
    // 先重算每张订单，再画食材描边，刚合成出的食材会立即得到对应提示。
    if (this.orderLayer) this.buildOrders(this.orderLayer);
    this.updateCellHighlights();

    this.boardObjects?.destroy();
    const objects = new Node('BoardObjects');
    this.boardFrame.addChild(objects);
    objects.layer = this.boardFrame.layer;
    this.boardObjects = objects;
    this.prepStationNode = null;

    this.state.board.forEach((cell) => {
      if (!cell.itemId || cell.index === this.state.backpackCellIndex || cell.index === this.state.prepStationCellIndex) {
        return;
      }
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

    // 食材保持自己的颜色：选中是把它脚下那格底色刷成深棕（见 paintCells），描边只表示「订单需要它」。
    const itemNode = addPanel(
      parent,
      `Item${cellIndex}`,
      position.x,
      position.y,
      ITEM_SIZE,
      ITEM_SIZE,
      getItemColor(item.chain),
      this.readyOrderItemIndexes.has(cellIndex) ? palette.orderReady : undefined,
      14
    );
    addText(itemNode, 'ItemName', item.name, 0, 0, 72, 58, 18, palette.ink);

    if (this.readyOrderItemIndexes.has(cellIndex)) {
      const badge = addPanel(itemNode, 'ReadyBadge', 28, 28, 26, 26, palette.orderReady, undefined, 13);
      addText(badge, 'ReadyMark', '✓', 0, 0, 26, 26, 18, palette.pureWhite);
    }

    makeDraggable(itemNode, {
      onDragStart: () => {
        // 一拿起来就选中它，介绍立刻出来；但格子不点亮——食材已经被拿走了。
        // 棋盘不能整个重绘（手上这个节点会被销毁），所以只刷底色和信息条，两样都不碰食材节点。
        this.dragging = true;
        this.selectedCellIndex = cellIndex;
        this.updateCellHighlights();
        this.renderSelectionInfo();
      },
      onTap: () => this.toggleSelection(cellIndex, () => this.clearSelection()),
      onDrop: (node) => this.dropItem(node, cellIndex)
    });
  }

  private buildPrepStation(parent: Node): void {
    const position = this.cellPositions[this.state.prepStationCellIndex];
    if (!position) return;

    const prepStation = addPanel(
      parent,
      'PrepStation',
      position.x,
      position.y,
      ITEM_SIZE,
      ITEM_SIZE,
      palette.prepStation,
      palette.prepStationStroke,
      14
    );
    addText(prepStation, 'PrepStationLabel', '备料台', 0, 0, 74, 62, 17, palette.ink);
    this.prepStationNode = prepStation;

    makeDraggable(prepStation, {
      onDragStart: () => {
        // 设施拖起来不选中：选中态等于「再点一下就执行」，备料台会因此白扣体力。
        this.dragging = true;
        this.selectedCellIndex = -1;
        this.updateCellHighlights();
        this.renderSelectionInfo();
      },
      onTap: () => this.toggleSelection(this.state.prepStationCellIndex, () => this.generateFromPrepStation()),
      onDrop: (node) => this.dropPrepStation(node)
    });
  }

  private buildBackpack(parent: Node): void {
    // 棋盘塞满时存档会把设施位置写成 -1，这里没有格子可站，先不画。
    const position = this.cellPositions[this.state.backpackCellIndex];
    if (!position) return;

    const backpack = addPanel(
      parent,
      'BoardBackpack',
      position.x,
      position.y,
      ITEM_SIZE,
      ITEM_SIZE,
      palette.backpack,
      palette.backpackStroke,
      6
    );
    addText(backpack, 'BackpackLabel', '背包', 0, 0, 74, 58, 24, palette.white);

    makeDraggable(backpack, {
      onDragStart: () => {
        // 设施拖起来不选中：选中态等于「再点一下就执行」，备料台会因此白扣体力。
        this.dragging = true;
        this.selectedCellIndex = -1;
        this.updateCellHighlights();
        this.renderSelectionInfo();
      },
      onTap: () => this.toggleSelection(this.state.backpackCellIndex, () => this.openBackpackModal()),
      onDrop: (node) => this.dropBackpack(node)
    });
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
      palette.cream,
      palette.goldStroke,
      12
    );
    card.setSiblingIndex(this.contentRoot.children.length - 1);
    this.selectionInfo = card;

    addText(card, 'SelectionName', selection.name, -180, 16, 200, 30, 21, palette.ink);
    addText(card, 'SelectionLevel', selection.level, 190, 16, 140, 30, 16, palette.amber);
    addText(card, 'SelectionDescription', selection.description, 0, -16, 500, 28, 15, palette.inkSoft);
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

    return { name: item.name, level: `${item.level} 级`, description: item.description };
  }

  private generateFromPrepStation(): void {
    const reservedIndexes = [this.state.backpackCellIndex, this.state.prepStationCellIndex];
    if (!hasAvailableBoardCell(this.state.board, reservedIndexes)) {
      this.showBoardNotice('棋盘没有空位');
      return;
    }

    const item = rollBasicItem(this.itemConfigs);
    if (!item) {
      this.showBoardNotice('没有可用食材');
      return;
    }

    const result = spendStamina(this.state, 1);
    if (!result.spent) {
      this.state = result.state;
      this.showBoardNotice('体力不足');
      return;
    }

    const spawnedIndex = findAvailableBoardCellIndex(result.state.board, reservedIndexes);
    this.state = {
      ...result.state,
      board: spawnBasicItem(result.state.board, item.id, reservedIndexes)
    };
    this.persistState();
    this.renderStatusBar();
    // 选中态留在备料台上：产出后如果跳到新食材身上，就得「点一下选中、再点一下产出」，
    // 每出一个食材都要点两下。连点备料台应该一直出东西。
    this.renderBoardObjects();
    this.animateSettle(spawnedIndex);
  }

  private dropPrepStation(node: Node): void {
    this.dragging = false;
    const targetIndex = this.findDropCellIndex(node.position);
    if (targetIndex === -1) {
      this.renderBoardObjects();
      return;
    }

    if (targetIndex === this.state.backpackCellIndex) {
      const stored = storePrepStationInBackpack(this.state);
      if (stored.stored) this.state = stored.state;
      this.persistState();
      this.renderBoardObjects();
      this.showBoardNotice(stored.stored ? '备料台已放入背包' : '背包已满');
      return;
    }

    const result = moveFixture(
      this.state.board,
      this.state.prepStationCellIndex,
      targetIndex,
      this.state.backpackCellIndex
    );
    if (!result.moved) {
      this.renderBoardObjects();
      return;
    }

    this.state = {
      ...this.state,
      board: result.board,
      prepStationCellIndex: result.fixtureCellIndex,
      backpackCellIndex: result.otherFixtureCellIndex
    };
    this.persistState();
    this.renderBoardObjects();
    if (result.displaced) this.animateDisplacement(result.displaced);
  }

  private dropBackpack(node: Node): void {
    this.dragging = false;
    const targetIndex = this.findDropCellIndex(node.position);
    if (targetIndex === -1) {
      this.renderBoardObjects();
      return;
    }

    const result = moveFixture(
      this.state.board,
      this.state.backpackCellIndex,
      targetIndex,
      this.state.prepStationCellIndex
    );
    if (!result.moved) {
      this.renderBoardObjects();
      return;
    }

    this.state = {
      ...this.state,
      board: result.board,
      backpackCellIndex: result.fixtureCellIndex,
      prepStationCellIndex: result.otherFixtureCellIndex
    };
    this.persistState();
    this.renderBoardObjects();
    if (result.displaced) this.animateDisplacement(result.displaced);
  }

  /**
   * 拖完之后，食材停在哪一格就选中哪一格，底部信息条随之介绍它。
   * 重绘会把手上这个节点销毁、在格子中心重建一个，所以松手位置要先记下来，
   * 让新节点从那儿被「吸」回格心——不然食材是瞬移过去的，落格没有任何手感。
   */
  private dropItem(node: Node, cellIndex: number): void {
    this.dragging = false;
    const releasedAt = node.position.clone();
    const targetIndex = this.findDropCellIndex(node.position);
    if (targetIndex === -1 || targetIndex === cellIndex) {
      this.selectCell(cellIndex);
      this.snapItemIntoCell(cellIndex, releasedAt);
      return;
    }

    if (targetIndex === this.state.backpackCellIndex) {
      // 食材离开棋盘进了背包，没有格子好选。
      this.storeItemInBackpack(cellIndex);
      return;
    }

    const merged = tryMerge(this.state.board, cellIndex, targetIndex, this.itemConfigs);
    if (merged.merged) {
      this.state = { ...this.state, board: merged.board };
      this.persistState();
      this.selectCell(targetIndex);
      this.snapItemIntoCell(targetIndex, releasedAt);
      this.animateSettle(targetIndex);
      return;
    }

    if (targetIndex === this.state.prepStationCellIndex) {
      this.pushPrepStationAside(cellIndex, releasedAt);
      return;
    }

    const moved = moveBoardItem(this.state.board, cellIndex, targetIndex, [
      this.state.backpackCellIndex,
      this.state.prepStationCellIndex
    ]);
    if (!moved.moved) {
      this.selectCell(cellIndex);
      this.snapItemIntoCell(cellIndex, releasedAt);
      return;
    }

    this.state = { ...this.state, board: moved.board };
    this.persistState();
    this.selectCell(targetIndex);
    this.snapItemIntoCell(targetIndex, releasedAt);
    if (moved.displaced) this.animateDisplacement(moved.displaced);
  }

  /** 松手位置 → 格心，快、带一点回弹，像被磁铁吸进去。 */
  private snapItemIntoCell(cellIndex: number, from: Readonly<Vec3>): void {
    const node = this.boardObjects?.getChildByName(`Item${cellIndex}`);
    const to = this.cellPositions[cellIndex];
    if (!node || !to) return;

    node.setPosition(from.x, from.y);
    tween(node)
      .to(SNAP_SECONDS, { position: new Vec3(to.x, to.y, 0) }, { easing: 'backOut' })
      .start();
  }

  private selectCell(cellIndex: number): void {
    this.selectedCellIndex = cellIndex;
    this.renderBoardObjects();
  }

  private submitOrder(activeOrder: ActiveOrder): void {
    const order = this.orderConfigs.find((entry) => entry.id === activeOrder.orderId);
    if (!order) {
      return;
    }
    const match = getOrderBoardMatch(order, this.state.board, this.itemConfigs);
    if (!match.complete) {
      this.renderBoardObjects();
      this.showBoardNotice('食材还没有备齐');
      return;
    }

    const deliveredItemIds = match.matchedCellIndexes
      .map((cellIndex) => this.state.board[cellIndex]?.itemId)
      .filter((itemId): itemId is ItemId => itemId !== null && itemId !== undefined);
    const rewarded = completeOrder(this.state, order, deliveredItemIds, this.healingConfig);
    const board = rewarded.board.map((cell) => ({ ...cell }));
    match.matchedCellIndexes.forEach((cellIndex) => {
      board[cellIndex].itemId = null;
    });

    // 先把要飞走的食材和旧订单层摘出来：下面重绘会销毁它们，而动画还要用。
    const target = this.getOrderCardPosition(activeOrder);
    const ghostCardName = this.getOrderCardName(activeOrder);
    const ghosts = this.detachDeliveredItems(match.matchedCellIndexes);
    const ghostOrders = this.replaceOrderLayerWithGhost();

    // 状态一次性结清，界面里的棋盘立刻就是最终事实：食材没了、金币入账了。
    // 之后只剩三件装饰：幽灵食材飞行、旧订单卡收走、新订单层淡入 + 顶部数值滚动追上新金币。
    this.state = {
      ...rewarded,
      board,
      activeOrders: replaceCompletedOrder(
        rewarded.activeOrders,
        activeOrder.instanceId,
        this.orderConfigs,
        rewarded.unlocked
      )
    };
    this.persistState();
    this.renderBoardObjects();
    this.animateDelivery(ghosts, target, ghostOrders, ghostCardName);
  }

  /**
   * 旧订单层原地留下当幽灵：新订单已经按真状态建好，但要等食材飞到、旧卡收走之后才淡入，
   * 否则下一位客人会赶在食材落地之前就坐进这个位置。幽灵上的按钮全部禁用，它已经不是真相了。
   */
  private replaceOrderLayerWithGhost(): Node | null {
    const ghost = this.orderLayer;
    if (!ghost || !this.contentRoot) return null;

    ghost.name = 'OrderLayerGhost';
    ghost.getComponentsInChildren(Button).forEach((button) => {
      button.interactable = false;
    });

    const fresh = new Node('OrderLayer');
    this.contentRoot.addChild(fresh);
    fresh.layer = this.contentRoot.layer;
    fresh.setSiblingIndex(ghost.getSiblingIndex());
    fresh.active = false;
    this.orderLayer = fresh;
    return ghost;
  }

  /** 把交付的食材节点搬到飞行层，坐标换算到 contentRoot 下，这样棋盘重绘销毁不到它们。 */
  private detachDeliveredItems(cellIndexes: number[]): Node[] {
    const frame = this.boardFrame?.position;
    const layer = this.flightLayer;
    if (!frame || !layer) return [];

    return cellIndexes
      .map((cellIndex) => this.boardObjects?.getChildByName(`Item${cellIndex}`))
      .filter((node): node is Node => !!node)
      .map((node) => {
        const position = new Vec3(node.position.x + frame.x, node.position.y + frame.y, 0);
        layer.addChild(node);
        node.setPosition(position);
        return node;
      });
  }

  /** 订单卡在 orderLayer 里的节点名，队列排序会变，所以要在结算前问。 */
  private getOrderCardName(activeOrder: ActiveOrder): string {
    const orderIndex = this.state.activeOrders.findIndex((order) => order.instanceId === activeOrder.instanceId);
    return `OrderCard${orderIndex + 1}`;
  }

  /** 订单卡中心，换算到 contentRoot 坐标系。 */
  private getOrderCardPosition(activeOrder: ActiveOrder): Vec3 {
    const card = this.orderLayer?.getChildByName(this.getOrderCardName(activeOrder));
    const layer = this.orderLayer?.position ?? new Vec3();
    if (!card) return new Vec3(layer.x, layer.y, 0);
    return new Vec3(card.position.x + layer.x, card.position.y + layer.y, 0);
  }

  private animateDelivery(
    ghosts: Node[],
    target: Vec3,
    ghostOrders: Node | null,
    ghostCardName: string
  ): void {
    // 数值和新订单都滞后于状态，但状态已经是真的：中途退出最多是少看一次动画，奖励不会丢。
    this.pendingRewardReveal = true;
    const revealRewards = (): void => {
      this.pendingRewardReveal = false;
      this.renderStatusBar();
      this.revealOrderLayer();
      ghostOrders?.destroy();
    };

    if (ghosts.length === 0) {
      revealRewards();
      return;
    }

    ghosts.forEach((ghost, index) => {
      const isLast = index === ghosts.length - 1;
      tween(ghost)
        .delay(index * 0.06)
        .to(0.12, { scale: new Vec3(1.14, 1.14, 1) }, { easing: 'quadOut' })
        .to(0.3, { position: target, scale: new Vec3(0.2, 0.2, 1) }, { easing: 'quadIn' })
        .call(() => {
          ghost.destroy();
          // 最后一份食材落到卡上，旧订单卡才收走，新订单跟着淡入。
          if (isLast) this.animateGhostCardExit(ghostOrders, ghostCardName, revealRewards);
        })
        .start();
    });
  }

  /** 旧订单卡弹一下再收走；卡找不到就直接进下一步，别把新订单卡在幽灵后面。 */
  private animateGhostCardExit(ghostOrders: Node | null, ghostCardName: string, onFinished: () => void): void {
    const card = ghostOrders?.getChildByName(ghostCardName);
    if (!card) {
      onFinished();
      return;
    }

    tween(card)
      .to(0.1, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'quadOut' })
      .to(0.14, { scale: new Vec3(0.82, 0.82, 1) }, { easing: 'quadIn' })
      .call(onFinished)
      .start();
  }

  private revealOrderLayer(): void {
    const layer = this.orderLayer;
    if (!layer || layer.active) return;

    const opacity = layer.getComponent(UIOpacity) ?? layer.addComponent(UIOpacity);
    opacity.opacity = 0;
    layer.active = true;
    tween(opacity).to(0.16, { opacity: 255 }).start();
  }

  private storeItemInBackpack(cellIndex: number): void {
    const result = storeBoardItemInBackpack(this.state, cellIndex);
    if (result.stored) {
      this.state = result.state;
      this.persistState();
    }
    this.renderBoardObjects();
    this.showBoardNotice(result.stored ? '已放入背包' : '背包已满');
  }

  /** 食材压到备料台头上，备料台照样被顺时针挤开——它不比食材金贵。 */
  private pushPrepStationAside(itemCellIndex: number, releasedAt: Readonly<Vec3>): void {
    const stationIndex = this.state.prepStationCellIndex;
    const result = placeItemOnFixtureCell(this.state.board, itemCellIndex, stationIndex, [
      this.state.backpackCellIndex
    ]);
    if (!result.moved) {
      this.selectCell(itemCellIndex);
      this.snapItemIntoCell(itemCellIndex, releasedAt);
      return;
    }

    this.state = {
      ...this.state,
      board: result.board,
      prepStationCellIndex: result.fixtureCellIndex
    };
    this.persistState();
    // 备料台被推走了，食材占下它原来那一格。
    this.selectCell(stationIndex);
    this.snapItemIntoCell(stationIndex, releasedAt);
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
    const node = cellIndex === this.state.prepStationCellIndex
      ? this.prepStationNode
      : this.boardObjects?.getChildByName(`Item${cellIndex}`);
    if (!node) return;

    node.setScale(1.16, 1.16, 1);
    tween(node).to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
  }

  /** 松手点落在哪一格；离最近的格子还超过一格远，就是没落在棋盘上，返回 -1。 */
  private findDropCellIndex(position: Readonly<Vec3>): number {
    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.cellPositions.forEach((cellPosition, index) => {
      const distance = Vec3.squaredDistance(position, cellPosition);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestDistance <= DROP_MAX_DISTANCE * DROP_MAX_DISTANCE ? closestIndex : -1;
  }

  private openBackpackModal(): void {
    if (this.backpackModal) return;

    this.clearSelection();
    const overlay = addPanel(this.node, 'BackpackModal', 0, 0, 750, 1334, palette.overlay, undefined, 0);
    overlay.setSiblingIndex(this.node.children.length - 1);
    this.backpackModal = overlay;

    const panel = addPanel(overlay, 'BackpackPanel', 0, 20, 650, 850, palette.panel, palette.blue, 14);
    addText(panel, 'BackpackTitle', '背包', 0, 365, 300, 56, 38, palette.ink);
    addText(
      panel,
      'BackpackCapacity',
      `${this.state.backpackItemIds.length} / ${this.state.backpackCapacity}`,
      0,
      310,
      240,
      38,
      24,
      palette.amber
    );
    addText(panel, 'BackpackHint', '点一下取出，放回棋盘。', 0, 262, 400, 34, 18, palette.inkSoft);

    const columns = 5;
    const slotSize = 104;
    const gap = 14;
    const startX = -((columns - 1) * (slotSize + gap)) / 2;
    const startY = 185;
    for (let index = 0; index < this.state.backpackCapacity; index += 1) {
      const slot = addPanel(
        panel,
        `BackpackSlot${index}`,
        startX + (index % columns) * (slotSize + gap),
        startY - Math.floor(index / columns) * (slotSize + gap),
        slotSize,
        slotSize,
        palette.backpackSlot,
        undefined,
        12
      );
      this.buildBackpackSlotContent(slot, index);
    }

    addButton(panel, 'CloseBackpackButton', '关闭', 0, -345, 150, 58, palette.red, () => this.closeBackpackModal());
  }

  private buildBackpackSlotContent(slot: Node, slotIndex: number): void {
    const storedId = this.state.backpackItemIds[slotIndex];
    if (!storedId) return;

    const stored = this.describeStoredItem(storedId);
    if (!stored) return;

    addPanel(slot, 'StoredItemColor', 0, 13, 64, 34, stored.color, undefined, 10);
    addText(slot, 'StoredItemName', stored.name, 0, -22, 90, 42, 16, palette.ink);
    slot.on(Node.EventType.TOUCH_END, () => this.takeFromBackpack(slotIndex));
  }

  private describeStoredItem(storedId: ItemId): { name: string; color: ReturnType<typeof getItemColor> } | null {
    if (storedId === PREP_STATION_ID) {
      return { name: '备料台', color: palette.prepStation };
    }

    const item = this.itemConfigs.find((entry) => entry.id === storedId);
    return item ? { name: item.name, color: getItemColor(item.chain) } : null;
  }

  private takeFromBackpack(slotIndex: number): void {
    const name = this.describeStoredItem(this.state.backpackItemIds[slotIndex])?.name ?? '食材';
    const result = takeBackpackItemToBoard(this.state, slotIndex);
    if (!result.taken) {
      this.showBoardNotice(result.reason === 'board_full' ? '棋盘没有空位' : '这个格子是空的');
      return;
    }

    this.state = result.state;
    this.persistState();
    this.closeBackpackModal();
    this.renderBoardObjects();
    this.animateSettle(result.cellIndex);
    this.showBoardNotice(`已取出：${name}`);
  }

  private closeBackpackModal(): void {
    this.backpackModal?.destroy();
    this.backpackModal = null;
  }

  /** 屏幕正中的 toast：灰黑底白字、无描边，只用来说明「点了却没生效」的原因。 */
  private showBoardNotice(message: string): void {
    this.node.getChildByName('BoardNotice')?.destroy();

    const toast = addPanel(this.node, 'BoardNotice', 0, 0, 360, 84, palette.toast, undefined, 16);
    addText(toast, 'BoardNoticeText', message, 0, 0, 330, 60, 22, palette.pureWhite);
    toast.setSiblingIndex(this.node.children.length - 1);

    const opacity = toast.addComponent(UIOpacity);
    toast.setScale(0.9, 0.9, 1);
    tween(toast).to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    tween(opacity)
      .delay(0.9)
      .to(0.25, { opacity: 0 })
      .call(() => {
        if (toast.isValid) toast.destroy();
      })
      .start();
  }
}
