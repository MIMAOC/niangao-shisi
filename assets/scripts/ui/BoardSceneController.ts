import { _decorator, Color, Component, director, Node, ResolutionPolicy, UITransform, view } from 'cc';
import { createInitialGameState } from '../core/gameState';
import { addButton, addPanel, addText } from './UiKit';
import { StatusBarView } from './StatusBarView';

const { ccclass } = _decorator;

@ccclass('BoardSceneController')
export class BoardSceneController extends Component {
  onLoad(): void {
    view.setDesignResolutionSize(750, 1334, ResolutionPolicy.FIXED_WIDTH);
    this.buildScene();
  }

  returnHomeScene(): void {
    director.loadScene('Home');
  }

  private buildScene(): void {
    const root = new Node('BoardContent');
    this.node.addChild(root);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);

    addPanel(root, 'PaperBackground', 0, 0, 750, 1334, new Color(247, 232, 197), undefined, 0);
    root.addComponent(StatusBarView).render(createInitialGameState());
    addText(root, 'BoardTitle', '今日营业', 0, 500, 300, 54, 34, new Color(91, 64, 55));

    this.buildOrders(root);
    this.buildBoard(root);

    addButton(root, 'BasketButton', '食材篮', -255, -555, 150, 72, new Color(218, 91, 77), () => undefined);
    addButton(root, 'HomeButton', '返回食肆', -85, -555, 160, 72, new Color(102, 145, 190), () => this.returnHomeScene());
    addButton(root, 'MenuButton', '菜单', 90, -555, 140, 72, new Color(238, 174, 55), () => undefined);
    addButton(root, 'BagButton', '背包', 250, -555, 140, 72, new Color(91, 166, 126), () => undefined);
  }

  private buildOrders(root: Node): void {
    const orders = [
      { title: '放学学生', item: '米团', color: new Color(255, 248, 225) },
      { title: '晚归上班族', item: '热茶', color: new Color(238, 246, 232) },
      { title: '散步老人', item: '烤红薯', color: new Color(247, 226, 220) }
    ];

    orders.forEach((order, index) => {
      const card = addPanel(
        root,
        `OrderCard${index + 1}`,
        -235 + index * 235,
        414,
        210,
        104,
        order.color,
        new Color(119, 83, 65),
        8
      );
      addText(card, 'CustomerText', order.title, 0, 22, 180, 34, 21, new Color(91, 64, 55));
      addText(card, 'OrderItemText', `需要：${order.item}`, 0, -20, 180, 34, 20, new Color(176, 82, 67));
    });
  }

  private buildBoard(root: Node): void {
    const frame = addPanel(root, 'BoardFrame', 0, -22, 566, 720, new Color(222, 186, 132), new Color(104, 73, 62), 8);
    const cellSize = 66;
    const gap = 6;
    const totalWidth = cellSize * 7 + gap * 6;
    const totalHeight = cellSize * 9 + gap * 8;
    const startX = -totalWidth / 2 + cellSize / 2;
    const startY = totalHeight / 2 - cellSize / 2;

    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const index = row * 7 + column;
        addPanel(
          frame,
          `BoardCell${index}`,
          startX + column * (cellSize + gap),
          startY - row * (cellSize + gap),
          cellSize,
          cellSize,
          new Color(255, 247, 224),
          new Color(192, 153, 107),
          6
        );
      }
    }
  }
}
