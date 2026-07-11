import type { GameState, PetFoodConfig, PetStageConfig } from './types';

export type FeedPetResult =
  | { ok: true; state: GameState }
  | { ok: false; state: GameState; reason: 'wrong_food' | 'not_enough_coins' };

export function feedPet(
  state: GameState,
  food: PetFoodConfig,
  stage: PetStageConfig
): FeedPetResult {
  if (!food.allowedStages.includes(stage.id) || !stage.acceptedFoodIds.includes(food.id)) {
    return { ok: false, state, reason: 'wrong_food' };
  }

  if (state.coins < food.priceCoins) {
    return { ok: false, state, reason: 'not_enough_coins' };
  }

  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - food.priceCoins,
      petIntimacy: state.petIntimacy + food.intimacyGain,
      updatedAt: Date.now()
    }
  };
}

export function syncPetStage(state: GameState, petStages: PetStageConfig[]): GameState {
  const unlockedStages = petStages
    .filter((stage) => state.shopLevel >= stage.unlockShopLevel)
    .sort((a, b) => b.unlockShopLevel - a.unlockShopLevel);

  if (unlockedStages.length === 0) {
    throw new Error('No pet stage is unlocked');
  }

  return {
    ...state,
    petStageId: unlockedStages[0].id,
    updatedAt: Date.now()
  };
}
