import {
  _decorator,
  Color,
  Component,
  director,
  Graphics,
  Node,
  ResolutionPolicy,
  UITransform,
  Vec3,
  view
} from 'cc';
import { createInitialGameState } from '../core/gameState';
import type { GameState, ItemConfig, LevelConfig } from '../core/types';
import { loadGameState, loadJsonConfig } from './gameStore';
import { getItemColor, palette } from './theme';
import { addButton, addPanel, addText } from './UiKit';
import { StatusBarView } from './StatusBarView';

const { ccclass } = _decorator;

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
        loadJsonConfig<ItemConfig[]>('config/items'),
        loadJsonConfig<LevelConfig[]>('config/levels')
      ]);
    } catch (error) {
      console.error('Failed to load home configs', error);
      return;
    }

    this.state = loadGameState();
    this.buildScene();
  }

  private buildScene(): void {
    const root = new Node('HomeContent');
    this.node.addChild(root);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);

    addPanel(root, 'NightSky', 0, 0, 750, 1334, palette.nightSky, undefined, 0);
    addPanel(root, 'StreetGlow', 0, -410, 750, 514, palette.streetGlow, undefined, 0);

    root.addComponent(StatusBarView).render(this.state);

    addText(root, 'GameTitle', '年糕食肆', 0, 490, 520, 80, 54, palette.titleGold);
    addText(root, 'OpenSign', '今晚也好好吃饭', 0, 438, 420, 42, 24, palette.signText);

    this.drawShop(root);

    addButton(root, 'BusinessButton', '营业', 0, -392, 290, 82, palette.red, () => this.enterBoardScene());

    addButton(root, 'ShopButton', '店铺', -230, -545, 190, 72, palette.coin, () => undefined);
    addButton(root, 'PetButton', '宠物', 0, -545, 190, 72, palette.green, () => undefined);
    addButton(root, 'MenuButton', '菜单', 230, -545, 190, 72, palette.blue, () => this.openMenuModal());
  }

  private openMenuModal(): void {
    if (this.menuModal) return;

    const overlay = addPanel(this.node, 'MenuModal', 0, 0, 750, 1334, palette.menuOverlay, undefined, 0);
    overlay.setSiblingIndex(this.node.children.length - 1);
    this.menuModal = overlay;

    const panel = addPanel(overlay, 'MenuPanel', 0, 20, 670, 940, palette.panel, palette.blue, 14);
    addText(panel, 'MenuTitle', '菜单', 0, 410, 300, 56, 38, palette.ink);
    addText(panel, 'MenuHint', '同款食材两两合成，越合越高级。', 0, 362, 560, 34, 18, palette.inkSoft);

    this.buildChains(panel);
    this.buildUnlockHint(panel);

    addButton(panel, 'CloseMenuButton', '关闭', 0, -420, 150, 58, palette.red, () => this.closeMenuModal());
  }

  private buildChains(panel: Node): void {
    const chains: ItemConfig['chain'][] = ['rice', 'tea', 'sweet_potato'];

    chains.forEach((chain, chainIndex) => {
      const items = this.itemConfigs
        .filter((item) => item.chain === chain)
        .sort((left, right) => left.level - right.level);
      const rowY = 280 - chainIndex * 200;

      addText(panel, `ChainTitle${chain}`, chainTitles[chain], -250, rowY, 220, 34, 22, palette.amber);

      items.forEach((item, index) => {
        const unlocked = this.isUnlocked(item);
        const card = addPanel(
          panel,
          `ChainItem${item.id}`,
          -240 + index * 160,
          rowY - 76,
          140,
          104,
          unlocked ? getItemColor(item.chain) : palette.locked,
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
          unlocked ? palette.ink : palette.inkMuted
        );
        addText(card, 'ChainItemDetail', `${item.level} 级`, 0, 2, 128, 26, 14, palette.inkSoft);
        addText(
          card,
          'ChainItemDescription',
          unlocked ? item.description : '继续经营就能端上桌。',
          0,
          -28,
          128,
          40,
          12,
          palette.inkSoft
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

    const strip = addPanel(panel, 'UnlockHint', 0, -330, 590, 76, palette.cream, palette.goldStroke, 10);
    addText(strip, 'UnlockHintTitle', `当前店铺等级 ${this.state.shopLevel}`, 0, 18, 560, 28, 17, palette.amber);
    addText(strip, 'UnlockHintText', text, 0, -14, 560, 32, 15, palette.ink);
  }

  private closeMenuModal(): void {
    this.menuModal?.destroy();
    this.menuModal = null;
  }

  /** 店面插画：一次性的手绘，颜色只在这里用，就不进色板了。 */
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

    const petBadge = addPanel(shop, 'PetBadge', 220, -210, 92, 92, new Color(142, 194, 150), palette.ink, 8);
    addText(petBadge, 'PetText', '小猫', 0, 0, 72, 48, 22, palette.pureWhite);
  }
}
