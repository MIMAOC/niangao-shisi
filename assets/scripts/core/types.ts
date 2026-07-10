export type CurrencyCode = 'coins' | 'premiumIngots' | 'experience' | 'healingPoints' | 'stamina';
export type ItemId = string;
export type OrderId = string;

export type CustomerType =
  | 'student'
  | 'worker'
  | 'elder'
  | 'courier'
  | 'medical'
  | 'couple'
  | 'mystery';

export interface ItemConfig {
  id: ItemId;
  name: string;
  chain: 'rice' | 'tea' | 'sweet_potato';
  level: number;
  nextId: ItemId | null;
  icon: string;
}

export interface OrderConfig {
  id: OrderId;
  requiredItemId: ItemId | 'any_level_3';
  customerType: CustomerType;
  customerName: string;
  line: string;
  rewards: {
    coins: number;
    experience: number;
    healingPoints: number;
  };
}

export interface LevelConfig {
  level: number;
  cumulativeExperience: number;
  unlocks: string[];
}

export interface PetStageConfig {
  id: 'kitten' | 'adolescent_cat' | 'adult_cat';
  unlockShopLevel: number;
  acceptedFoodIds: string[];
  bonus: {
    type: 'bring_item' | 'coins_percent' | 'healing_percent';
    value: number;
  };
}

export interface PetFoodConfig {
  id: string;
  name: string;
  priceCoins: number;
  intimacyGain: number;
  allowedStages: Array<PetStageConfig['id']>;
}

export interface CustomerHealingLevelConfig {
  level: number;
  requiredHealingPoints: number;
  rewardType: 'none' | 'coins_percent' | 'order_rate_percent' | 'daily_item' | 'cosmetic';
  rewardValue: number | string;
}

export interface PremiumItemConfig {
  id: string;
  name: string;
  pricePremiumIngots: number;
  effect: 'wildcard_merge' | 'refresh_order' | 'basic_item_pack' | 'board_sort' | 'temporary_bag_slot';
  dailyLimit: number | null;
}

export interface GameConfig {
  items: ItemConfig[];
  orders: OrderConfig[];
  levels: LevelConfig[];
  petStages: PetStageConfig[];
  petFoods: PetFoodConfig[];
  customerHealing: Record<CustomerType, CustomerHealingLevelConfig[]>;
  premiumItems: PremiumItemConfig[];
}

export interface BoardCell {
  index: number;
  itemId: ItemId | null;
}

export interface ActiveOrder {
  instanceId: string;
  orderId: OrderId;
}

export interface GameState {
  board: BoardCell[];
  activeOrders: ActiveOrder[];
  coins: number;
  premiumIngots: number;
  experience: number;
  healingPoints: number;
  stamina: number;
  shopLevel: number;
  petStageId: PetStageConfig['id'];
  petIntimacy: number;
  customerHealingByType: Record<CustomerType, number>;
  premiumPurchaseHistory: Record<string, number>;
  unlocked: string[];
  updatedAt: number;
}
