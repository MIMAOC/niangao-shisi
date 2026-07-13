import { _decorator, Color, Component, director, Graphics, Node, ResolutionPolicy, UITransform, Vec3, view } from 'cc';
import { createInitialGameState } from '../core/gameState';
import { addButton, addPanel, addText } from './UiKit';
import { StatusBarView } from './StatusBarView';

const { ccclass } = _decorator;

@ccclass('HomeSceneController')
export class HomeSceneController extends Component {
  onLoad(): void {
    view.setDesignResolutionSize(750, 1334, ResolutionPolicy.FIXED_WIDTH);
    this.buildScene();
  }

  enterBoardScene(): void {
    director.loadScene('Board');
  }

  private buildScene(): void {
    const root = new Node('HomeContent');
    this.node.addChild(root);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);

    addPanel(root, 'NightSky', 0, 0, 750, 1334, new Color(48, 64, 84), undefined, 0);
    addPanel(root, 'StreetGlow', 0, -410, 750, 514, new Color(107, 105, 102), undefined, 0);

    const status = root.addComponent(StatusBarView);
    status.render(createInitialGameState());

    addText(root, 'GameTitle', '年糕食肆', 0, 490, 520, 80, 54, new Color(255, 226, 143));
    addText(root, 'OpenSign', '今晚也好好吃饭', 0, 438, 420, 42, 24, new Color(244, 232, 211));

    this.drawShop(root);

    addButton(root, 'BusinessButton', '营业', 0, -392, 290, 82, new Color(218, 91, 77), () => this.enterBoardScene());

    const navItems = [
      { name: 'ShopButton', text: '店铺', color: new Color(238, 174, 55) },
      { name: 'PetButton', text: '宠物', color: new Color(91, 166, 126) },
      { name: 'MenuButton', text: '菜单', color: new Color(102, 145, 190) }
    ];
    navItems.forEach((item, index) => {
      addButton(root, item.name, item.text, -230 + index * 230, -545, 190, 72, item.color, () => undefined);
    });
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
