import { _decorator, Button, Color, Component, Label, Node } from 'cc';
import { getStaminaRecoveryRemainingMs, STAMINA_AD_DAILY_LIMIT, STAMINA_MAX } from '../core/stamina';
import type { GameState } from '../core/types';
import { addPanel, addText } from './UiKit';
import { getStaminaLabelOffsetY } from './staminaStatusLayout';
import { palette } from './theme';

const { ccclass } = _decorator;

const CHIP_WIDTH = 158;
const CHIP_GAP = 9;

interface StatusChip {
  label: string;
  color: Color;
  read: (state: GameState) => number;
}

const chips: StatusChip[] = [
  { label: '金币', color: palette.coin, read: (state) => state.coins },
  { label: '元宝', color: palette.ingot, read: (state) => state.premiumIngots },
  { label: '体力', color: palette.stamina, read: (state) => state.stamina },
  { label: '等级', color: palette.level, read: (state) => state.shopLevel }
];

/**
 * 状态栏每秒都要刷倒计时，但变的只有几个字。所以节点只建一次，
 * 之后只改 Label 的文字和显隐——别再每秒销毁重建一棵带 Graphics 的节点树。
 */
@ccclass('StatusBarView')
export class StatusBarView extends Component {
  private readonly valueLabels = new Map<string, Label>();
  /** 标签上正在显示的数（会带小数，是滚动的中间值），和状态里的真值分开存。 */
  private readonly displayedValues = new Map<string, number>();
  private readonly targetValues = new Map<string, number>();
  private countdownLabel: Label | null = null;
  private adButton: Node | null = null;
  private container: Node | null = null;

  render(state: GameState, onStaminaAd?: () => void): void {
    const isFirstRender = !this.container;
    if (isFirstRender) this.build(onStaminaAd);
    // 首次进场直接显示，不然会从 0 滚上来。
    this.updateChips(state, isFirstRender);
  }

  /** 数值不跳变，滚过去。真值早已在 state 里，这里只是让标签追上它。 */
  update(deltaTime: number): void {
    if (!this.container) return;

    let changed = false;
    this.targetValues.forEach((target, label) => {
      const current = this.displayedValues.get(label) ?? target;
      if (current === target) return;

      const next = Math.abs(target - current) < 1
        ? target
        : current + (target - current) * Math.min(1, deltaTime * 8);
      this.displayedValues.set(label, next);
      changed = true;
    });

    if (changed) this.paintValues();
  }

  private build(onStaminaAd?: () => void): void {
    this.container = addPanel(
      this.node,
      'StatusBar',
      0,
      592,
      704,
      76,
      palette.statusBar,
      palette.statusStroke
    );

    const startX = -((chips.length - 1) * (CHIP_WIDTH + CHIP_GAP)) / 2;
    chips.forEach((entry, index) => {
      const chip = addPanel(
        this.container as Node,
        `Status${entry.label}`,
        startX + index * (CHIP_WIDTH + CHIP_GAP),
        0,
        CHIP_WIDTH,
        52,
        entry.color,
        undefined,
        8
      );

      if (entry.label !== '体力') {
        const label = addText(chip, `${entry.label}Text`, '', 0, 0, CHIP_WIDTH - 12, 46, 22, palette.pureWhite);
        this.valueLabels.set(entry.label, label);
        return;
      }

      const staminaLabel = addText(chip, 'StaminaText', '', 0, 0, CHIP_WIDTH - 12, 30, 20, palette.pureWhite);
      this.valueLabels.set(entry.label, staminaLabel);
      this.countdownLabel = addText(chip, 'StaminaCountdown', '', 46, -15, 64, 22, 12, palette.pureWhite);

      if (!onStaminaAd) return;
      const button = addPanel(chip, 'StaminaAdButton', -42, -15, 70, 22, palette.staminaAd, undefined, 6);
      addText(button, 'StaminaAdText', '广告+25', 0, 0, 66, 20, 11, palette.pureWhite);
      button.addComponent(Button);
      button.on(Button.EventType.CLICK, onStaminaAd);
      this.adButton = button;
    });
  }

  private updateChips(state: GameState, snapToTarget: boolean): void {
    chips.forEach((entry) => {
      const value = entry.read(state);
      this.targetValues.set(entry.label, value);
      if (snapToTarget) this.displayedValues.set(entry.label, value);
    });
    this.paintValues();

    const staminaLabel = this.valueLabels.get('体力');
    staminaLabel?.node.setPosition(0, getStaminaLabelOffsetY(state.stamina));

    const remaining = getStaminaRecoveryRemainingMs(state);
    if (this.countdownLabel) {
      this.countdownLabel.node.active = remaining !== null;
      if (remaining !== null) this.countdownLabel.string = formatCountdown(remaining);
    }

    if (this.adButton) {
      this.adButton.active = state.stamina < STAMINA_MAX && state.staminaAdViews < STAMINA_AD_DAILY_LIMIT;
    }
  }

  private paintValues(): void {
    chips.forEach((entry) => {
      const label = this.valueLabels.get(entry.label);
      const value = this.displayedValues.get(entry.label);
      if (label && value !== undefined) label.string = `${entry.label} ${Math.round(value)}`;
    });
  }
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
