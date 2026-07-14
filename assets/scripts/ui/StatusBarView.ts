import { _decorator, Button, Color, Component, Graphics, Label, Node, UITransform } from 'cc';
import { getStaminaRecoveryRemainingMs, STAMINA_AD_DAILY_LIMIT, STAMINA_MAX } from '../core/stamina';
import type { GameState, LevelConfig } from '../core/types';
import { addPanel, addText } from './UiKit';
import { getLevelExperienceProgress } from './levelExperienceProgress';
import { getStaminaLabelOffsetY } from './staminaStatusLayout';
import { palette } from './theme';

const { ccclass } = _decorator;

/** 金币、元宝、体力等长方形状态块的宽度。 */
const CHIP_WIDTH = 158;
/** 相邻状态块之间的水平间距。 */
const CHIP_GAP = 9;
/** 左侧圆形头像的直径。 */
const AVATAR_DIAMETER = 64;
/** 头像外圈经验进度条的半径，略小于头像半径以免描边被裁切。 */
const AVATAR_RADIUS = 29;
/** 经验圆环描边的粗细。 */
const AVATAR_RING_WIDTH = 6;
/** 头像相对状态栏中心的横坐标；负数代表向左。 */
const AVATAR_X = -300;
/** 第一个（金币）状态块相对状态栏中心的横坐标；后续状态块按宽度和间距向右排列。 */
const CHIP_START_X = -160;

interface StatusChip {
  label: string;
  color: Color;
  read: (state: GameState) => number;
}

const chips: StatusChip[] = [
  { label: '金币', color: palette.coin, read: (state) => state.coins },
  { label: '元宝', color: palette.ingot, read: (state) => state.premiumIngots },
  { label: '体力', color: palette.stamina, read: (state) => state.stamina }
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
  private levelBadgeLabel: Label | null = null;
  private levelRing: Graphics | null = null;
  private levels: LevelConfig[] = [];

  setLevels(levels: LevelConfig[]): void {
    this.levels = levels;
  }

  render(state: GameState, onStaminaAd?: () => void): void {
    const isFirstRender = !this.container;
    if (isFirstRender) this.build(onStaminaAd);
    // 首次进场直接显示，不然会从 0 滚上来。
    this.updateChips(state, isFirstRender);
    this.paintLevelAvatar(state);
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

    this.buildLevelAvatar();

    chips.forEach((entry, index) => {
      const chip = addPanel(
        this.container as Node,
        `Status${entry.label}`,
        CHIP_START_X + index * (CHIP_WIDTH + CHIP_GAP),
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
      const button = new Node('StaminaAdButton');
      chip.addChild(button);
      button.layer = chip.layer;
      // 圆心贴在体力块左下角，圆形按钮略微跨出边框，作为补充体力的入口。
      button.setPosition(-CHIP_WIDTH / 2, -26);
      button.addComponent(UITransform).setContentSize(28, 28);
      const buttonGraphics = button.addComponent(Graphics);
      buttonGraphics.fillColor = palette.staminaAd;
      buttonGraphics.circle(0, 0, 14);
      buttonGraphics.fill();
      buttonGraphics.strokeColor = palette.pureWhite;
      buttonGraphics.lineWidth = 2;
      buttonGraphics.circle(0, 0, 13);
      buttonGraphics.stroke();
      addText(button, 'StaminaAdText', '＋', 0, 0, 24, 24, 19, palette.pureWhite);
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

  private buildLevelAvatar(): void {
    const avatar = new Node('LevelAvatar');
    (this.container as Node).addChild(avatar);
    avatar.layer = (this.container as Node).layer;
    avatar.setPosition(AVATAR_X, 0);
    avatar.addComponent(UITransform).setContentSize(AVATAR_DIAMETER, AVATAR_DIAMETER);

    const background = avatar.addComponent(Graphics);
    background.fillColor = palette.level;
    background.circle(0, 0, 25);
    background.fill();

    const ringTrack = new Node('LevelExperienceTrack');
    avatar.addChild(ringTrack);
    ringTrack.layer = avatar.layer;
    const trackGraphics = ringTrack.addComponent(Graphics);
    trackGraphics.strokeColor = palette.levelRingTrack;
    trackGraphics.lineWidth = AVATAR_RING_WIDTH;
    trackGraphics.circle(0, 0, AVATAR_RADIUS);
    trackGraphics.stroke();

    const ring = new Node('LevelExperienceRing');
    avatar.addChild(ring);
    ring.layer = avatar.layer;
    this.levelRing = ring.addComponent(Graphics);

    addText(avatar, 'LevelAvatarPlaceholder', '头像', 0, 0, 42, 42, 13, palette.pureWhite);
    const badge = addPanel(avatar, 'LevelBadge', 24, -24, 25, 25, palette.level, palette.pureWhite, 13);
    this.levelBadgeLabel = addText(badge, 'LevelBadgeText', '', 0, 0, 22, 22, 14, palette.pureWhite);
  }

  private paintLevelAvatar(state: GameState): void {
    if (!this.levelBadgeLabel || !this.levelRing) return;

    this.levelBadgeLabel.string = String(state.shopLevel);
    const progress = getLevelExperienceProgress(state.experience, state.shopLevel, this.levels);
    this.levelRing.clear();
    this.levelRing.strokeColor = palette.level;
    this.levelRing.lineWidth = AVATAR_RING_WIDTH;
    this.levelRing.arc(0, 0, AVATAR_RADIUS, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * progress, false);
    this.levelRing.stroke();
  }
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
