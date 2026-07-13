export type CurrencyCode = 'coins' | 'premiumIngots' | 'experience' | 'stamina';
export type ItemId = string;
export type OrderId = string;
export type OrderDifficulty = 'easy' | 'normal' | 'hard';

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
  difficulty: OrderDifficulty;
  rewards: {
    coins: number;
    experience: number;
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

export type CustomerUnlockType = 'dialogue' | 'action' | 'story' | 'reward';

export interface CustomerUnlockConfig {
  level: number;
  type: CustomerUnlockType;
  id: string;
  title: string;
}

export interface CustomerHealingProfileConfig {
  favoriteFoodIds: ItemId[];
  foodHealing: Record<ItemId, number>;
  unlocks: CustomerUnlockConfig[];
}

export interface CustomerHealingConfig {
  levelRequirements: number[];
  customers: Partial<Record<CustomerType, CustomerHealingProfileConfig>>;
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
  customerHealing: CustomerHealingConfig;
  premiumItems: PremiumItemConfig[];
}

export interface BoardCell {
  index: number;
  itemId: ItemId | null;
}

export interface ActiveOrder {
  instanceId: string;
  orderId: OrderId;
  difficulty: OrderDifficulty;
}

export interface GameState {
  board: BoardCell[];
  backpackCellIndex: number;
  activeOrders: ActiveOrder[];
  coins: number;
  premiumIngots: number;
  experience: number;
  stamina: number;
  shopLevel: number;
  petStageId: PetStageConfig['id'];
  petIntimacy: number;
  customerHealingByType: Record<CustomerType, number>;
  premiumPurchaseHistory: Record<string, number>;
  unlocked: string[];
  updatedAt: number;
}
