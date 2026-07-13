import {
  _decorator,
  Color,
  Component,
  director,
  Graphics,
  JsonAsset,
  Node,
  ResolutionPolicy,
  resources,
  sys,
  UITransform,
  Vec3,
  view
} from 'cc';
import { createInitialGameState } from '../core/gameState';
import { deserializeSave } from '../core/save';
import type { GameState, ItemConfig, LevelConfig } from '../core/types';
import { addButton, addPanel, addText } from './UiKit';
import { StatusBarView } from './StatusBarView';

const { ccclass } = _decorator;
const saveKey = 'niangao-shisi-save';
const chainTitles: Record<ItemConfig['chain'], string> = {
  rice: '饭团线',
  tea: '饮品线',
  sweet_potato: '小吃线'
};

@ccclass('HomeSceneController')
export class HomeSceneController extends Component {
  private state: GameState = createInitialGameState();
  private itemConfigs: ItemConfig[] = [];
  private levelConfigs: LevelConfig[] = [];
  private menuModal: Node | null = null;

  onLoad(): void {
    view.setDesignResolutionSize(750, 1334, ResolutionPolicy.FIXED_WIDTH);
    void this.initializeScene();
  }

  enterBoardScene(): void {
    director.loadScene('Board');
  }

  private async initializeScene(): Promise<void> {
    try {
      [this.itemConfigs, this.levelConfigs] = await Promise.all([
        this.loadJson<ItemConfig[]>('config/items'),
        this.loadJson<LevelConfig[]>('config/levels')
      ]);
      this.restoreState();
      this.buildScene();
    } catch (error) {
      console.error('Failed to initialize home scene', error);
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

  private buildScene(): void {
    const root = new Node('HomeContent');
    this.node.addChild(root);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);

    addPanel(root, 'NightSky', 0, 0, 750, 1334, new Color(48, 64, 84), undefined, 0);
    addPanel(root, 'StreetGlow', 0, -410, 750, 514, new Color(107, 105, 102), undefined, 0);

    const status = root.addComponent(StatusBarView);
    status.render(this.state);

    addText(root, 'GameTitle', '年糕食肆', 0, 490, 520, 80, 54, new Color(255, 226, 143));
    addText(root, 'OpenSign', '今晚也好好吃饭', 0, 438, 420, 42, 24, new Color(244, 232, 211));

    this.drawShop(root);

    addButton(root, 'BusinessButton', '营业', 0, -392, 290, 82, new Color(218, 91, 77), () => this.enterBoardScene());

    addButton(root, 'ShopButton', '店铺', -230, -545, 190, 72, new Color(238, 174, 55), () => undefined);
    addButton(root, 'PetButton', '宠物', 0, -545, 190, 72, new Color(91, 166, 126), () => undefined);
    addButton(root, 'MenuButton', '菜单', 230, -545, 190, 72, new Color(102, 145, 190), () => this.openMenuModal());
  }

  private openMenuModal(): void {
    if (this.menuModal) return;

    const overlay = addPanel(this.node, 'MenuModal', 0, 0, 750, 1334, new Color(28, 34, 44, 200), undefined, 0);
    overlay.setSiblingIndex(this.node.children.length - 1);
    this.menuModal = overlay;

    const panel = addPanel(overlay, 'MenuPanel', 0, 20, 670, 940, new Color(242, 232, 205), new Color(102, 145, 190), 14);
    addText(panel, 'MenuTitle', '菜单', 0, 410, 300, 56, 38, new Color(91, 64, 55));
    addText(
      panel,
      'MenuHint',
      '同款食材两两合成，越合越高级。',
      0,
      362,
      560,
      34,
      18,
      new Color(139, 111, 92)
    );

    this.buildChains(panel);
    this.buildUnlockHint(panel);

    addButton(panel, 'CloseMenuButton', '关闭', 0, -420, 150, 58, new Color(218, 91, 77), () => this.closeMenuModal());
  }

  private buildChains(panel: Node): void {
    const chains: ItemConfig['chain'][] = ['rice', 'tea', 'sweet_potato'];

    chains.forEach((chain, chainIndex) => {
      const items = this.itemConfigs
        .filter((item) => item.chain === chain)
        .sort((left, right) => left.level - right.level);
      const rowY = 280 - chainIndex * 200;

      addText(panel, `ChainTitle${chain}`, chainTitles[chain], -250, rowY, 220, 34, 22, new Color(174, 112, 63));

      items.forEach((item, index) => {
        const unlocked = this.isUnlocked(item);
        const cardX = -240 + index * 160;
        const card = addPanel(
          panel,
          `ChainItem${item.id}`,
          cardX,
          rowY - 76,
          140,
          104,
          unlocked ? this.getItemColor(chain) : new Color(214, 205, 186),
          undefined,
          10
        );
        addText(
          card,
          'ChainItemName',
          unlocked ? item.name : '未解锁',
          0,
          28,
          128,
          32,
          18,
          unlocked ? new Color(91, 64, 55) : new Color(139, 132, 118)
        );
        addText(card, 'ChainItemDetail', `${item.level} 级`, 0, 2, 128, 26, 14, new Color(139, 111, 92));
        addText(
          card,
          'ChainItemDescription',
          unlocked ? item.description : '继续经营就能端上桌。',
          0,
          -28,
          128,
          40,
          12,
          new Color(139, 111, 92)
        );
      });
    });
  }

  /** 存档里的 unlocked 形如 rice_level_2：该条线目前能做到几级。 */
  private isUnlocked(item: ItemConfig): boolean {
    const entry = this.state.unlocked.find((id) => id.startsWith(`${item.chain}_level_`));
    const maxLevel = Number(entry?.split('_level_')[1] ?? 0);
    return item.level <= maxLevel;
  }

  private buildUnlockHint(panel: Node): void {
    const next = this.levelConfigs
      .filter((level) => level.level > this.state.shopLevel)
      .sort((left, right) => left.level - right.level)[0];

    const text = next
      ? `店铺 ${next.level} 级解锁：${next.unlocks.join('、')}`
      : '所有菜品都已解锁，去接客吧。';

    const strip = addPanel(panel, 'UnlockHint', 0, -330, 590, 76, new Color(255, 249, 233), new Color(190, 129, 49), 10);
    addText(strip, 'UnlockHintTitle', `当前店铺等级 ${this.state.shopLevel}`, 0, 18, 560, 28, 17, new Color(174, 112, 63));
    addText(strip, 'UnlockHintText', text, 0, -14, 560, 32, 15, new Color(91, 64, 55));
  }

  private getItemColor(chain: ItemConfig['chain']): Color {
    if (chain === 'tea') return new Color(161, 211, 185);
    if (chain === 'sweet_potato') return new Color(241, 178, 132);
    return new Color(248, 218, 132);
  }

  private closeMenuModal(): void {
    this.menuModal?.destroy();
    this.menuModal = null;
  }

  private drawShop(root: Node): void {
    const shop = new Node('ShopIllustration');
    root.addChild(shop);
    shop.layer = root.layer;
    shop.setPosition(new Vec3(0, 45));
    shop.addComponent(UITransform).setContentSize(610, 650);
    const graphics = shop.addComponent(Graphics);

    graphics.fillColor = new Color(234, 197, 139);
    graphics.roundRect(-285, -265, 570, 500, 8);
    graphics.fill();

    graphics.fillColor = new Color(91, 64, 55);
    graphics.moveTo(-320, 205);
    graphics.lineTo(0, 315);
    graphics.lineTo(320, 205);
    graphics.close();
    graphics.fill();

    graphics.fillColor = new Color(216, 90, 75);
    graphics.roundRect(-160, 185, 320, 86, 8);
    graphics.fill();

    graphics.fillColor = new Color(255, 235, 174);
    graphics.roundRect(-135, 202, 270, 50, 6);
    graphics.fill();

    graphics.fillColor = new Color(68, 91, 92);
    graphics.roundRect(-240, -120, 190, 250, 6);
    graphics.fill();
    graphics.roundRect(50, -120, 190, 250, 6);
    graphics.fill();

    graphics.fillColor = new Color(255, 212, 116);
    graphics.roundRect(-218, -98, 146, 206, 4);
    graphics.fill();
    graphics.roundRect(72, -98, 146, 206, 4);
    graphics.fill();

    graphics.fillColor = new Color(160, 65, 69);
    for (let x = -245; x <= 205; x += 90) {
      graphics.roundRect(x, 115, 62, 96, 4);
      graphics.fill();
    }

    graphics.fillColor = new Color(112, 73, 50);
    graphics.roundRect(-285, -255, 570, 100, 5);
    graphics.fill();

    addText(shop, 'ShopSignText', '年糕食肆', 0, 227, 250, 46, 30, new Color(108, 67, 46));
    addText(shop, 'WindowMessage', '热饭 · 热茶 · 烤红薯', 0, -205, 450, 42, 23, new Color(255, 242, 212));

    const petBadge = addPanel(shop, 'PetBadge', 220, -210, 92, 92, new Color(142, 194, 150), new Color(91, 64, 55), 8);
    addText(petBadge, 'PetText', '小猫', 0, 0, 72, 48, 22, new Color(255, 255, 255));
  }
}
