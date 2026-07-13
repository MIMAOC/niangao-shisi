import { _decorator, Color, Component, Node } from 'cc';
import type { GameState } from '../core/types';
import { addPanel, addText } from './UiKit';

const { ccclass } = _decorator;

@ccclass('StatusBarView')
export class StatusBarView extends Component {
  private container: Node | null = null;

  render(state: GameState): void {
    this.container?.destroy();
    this.container = addPanel(
      this.node,
      'StatusBar',
      0,
      592,
      710,
      88,
      new Color(255, 247, 222),
      new Color(104, 73, 62)
    );

    const entries = [
      { label: '金币', value: state.coins, color: new Color(238, 174, 55) },
      { label: '元宝', value: state.premiumIngots, color: new Color(221, 99, 112) },
      { label: '体力', value: state.stamina, color: new Color(91, 166, 126) },
      { label: '等级', value: state.shopLevel, color: new Color(174, 114, 164) }
    ];

    const width = 160;
    const gap = 12;
    const startX = -((entries.length - 1) * (width + gap)) / 2;
    entries.forEach((entry, index) => {
      const chip = addPanel(
        this.container as Node,
        `Status${entry.label}`,
        startX + index * (width + gap),
        0,
        width,
        58,
        entry.color,
        undefined,
        8
      );
      addText(chip, `${entry.label}Text`, `${entry.label} ${entry.value}`, 0, 0, width - 12, 46, 22, new Color(255, 255, 255));
    });
  }
}
