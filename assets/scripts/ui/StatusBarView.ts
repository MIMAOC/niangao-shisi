import { _decorator, Button, Color, Component, Node } from 'cc';
import { getStaminaRecoveryRemainingMs, STAMINA_AD_DAILY_LIMIT } from '../core/stamina';
import type { GameState } from '../core/types';
import { addPanel, addText } from './UiKit';
import { getStaminaLabelOffsetY } from './staminaStatusLayout';

const { ccclass } = _decorator;

@ccclass('StatusBarView')
export class StatusBarView extends Component {
  private container: Node | null = null;

  render(state: GameState, onStaminaAd?: () => void): void {
    this.container?.destroy();
    this.container = addPanel(
      this.node,
      'StatusBar',
      0,
      592,
      704,
      76,
      new Color(255, 247, 222),
      new Color(104, 73, 62)
    );

    const entries = [
      { label: '金币', value: state.coins, color: new Color(238, 174, 55) },
      { label: '元宝', value: state.premiumIngots, color: new Color(221, 99, 112) },
      { label: '体力', value: state.stamina, color: new Color(91, 166, 126) },
      { label: '等级', value: state.shopLevel, color: new Color(174, 114, 164) }
    ];

    const width = 158;
    const gap = 9;
    const startX = -((entries.length - 1) * (width + gap)) / 2;
    entries.forEach((entry, index) => {
      const chip = addPanel(
        this.container as Node,
        `Status${entry.label}`,
        startX + index * (width + gap),
        0,
        width,
        52,
        entry.color,
        undefined,
        8
      );
      if (entry.label !== '体力') {
        addText(chip, `${entry.label}Text`, `${entry.label} ${entry.value}`, 0, 0, width - 12, 46, 22, new Color(255, 255, 255));
        return;
      }

      addText(
        chip,
        'StaminaText',
        `体力 ${entry.value}`,
        0,
        getStaminaLabelOffsetY(state.stamina),
        width - 12,
        30,
        20,
        new Color(255, 255, 255)
      );
      const remaining = getStaminaRecoveryRemainingMs(state);
      if (remaining !== null) {
        addText(chip, 'StaminaCountdown', formatCountdown(remaining), 46, -15, 64, 22, 12, new Color(255, 255, 255));
      }
      if (onStaminaAd && state.stamina < 100 && state.staminaAdViews < STAMINA_AD_DAILY_LIMIT) {
        const button = addPanel(chip, 'StaminaAdButton', -42, -15, 70, 22, new Color(71, 130, 102), undefined, 6);
        addText(button, 'StaminaAdText', `广告+25`, 0, 0, 66, 20, 11, new Color(255, 255, 255));
        button.addComponent(Button);
        button.on(Button.EventType.CLICK, onStaminaAd);
      }
    });
  }
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
