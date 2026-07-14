import { Color } from 'cc';
import type { ItemConfig } from '../core/types';

/**
 * 全局色板。UiKit 会把颜色拷进 Graphics / Label，所以这些常量共享是安全的，
 * 顺带省掉每帧重建时几十次 new Color。改配色只动这个文件。
 */
export const palette = {
  ink: new Color(91, 64, 55),
  inkSoft: new Color(139, 111, 92),
  inkMuted: new Color(139, 132, 118),
  amber: new Color(174, 112, 63),
  paper: new Color(247, 232, 197),
  cream: new Color(255, 249, 233),
  panel: new Color(242, 232, 205),
  white: new Color(255, 252, 240),
  pureWhite: new Color(255, 255, 255),

  boardFrame: new Color(239, 221, 193),
  boardCell: new Color(255, 249, 233),
  goldStroke: new Color(190, 129, 49),
  selected: new Color(255, 239, 152),
  orderReady: new Color(91, 166, 126),
  orderReadyPill: new Color(91, 166, 126, 46),

  coin: new Color(238, 174, 55),
  ingot: new Color(221, 99, 112),
  stamina: new Color(91, 166, 126),
  staminaAd: new Color(71, 130, 102),
  level: new Color(174, 114, 164),
  statusBar: new Color(255, 247, 222),
  statusStroke: new Color(104, 73, 62),

  red: new Color(218, 91, 77),
  blue: new Color(102, 145, 190),
  green: new Color(91, 166, 126),
  prepStation: new Color(242, 183, 72),
  prepStationStroke: new Color(190, 129, 49),
  backpack: new Color(91, 166, 126),
  backpackStroke: new Color(64, 112, 86),
  backpackSlot: new Color(255, 244, 215),

  orderCards: [new Color(255, 248, 225), new Color(238, 246, 232), new Color(247, 226, 220)],
  orderCardStroke: new Color(119, 83, 65),
  orderItemText: new Color(176, 82, 67),
  coinRewardText: new Color(177, 118, 37),
  healingRewardText: new Color(200, 86, 92),

  toast: new Color(58, 54, 51, 235),
  overlay: new Color(48, 42, 39, 190),
  menuOverlay: new Color(28, 34, 44, 200),
  locked: new Color(214, 205, 186),
  nightSky: new Color(48, 64, 84),
  streetGlow: new Color(107, 105, 102),
  titleGold: new Color(255, 226, 143),
  signText: new Color(244, 232, 211)
} as const;

const itemChainColors: Record<ItemConfig['chain'], Color> = {
  rice: new Color(248, 218, 132),
  tea: new Color(161, 211, 185),
  sweet_potato: new Color(241, 178, 132)
};

export function getItemColor(chain: ItemConfig['chain']): Color {
  return itemChainColors[chain];
}
