import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../../assets/scripts/core/gameState';
import { feedPet, syncPetStage } from '../../assets/scripts/core/pet';
import type { PetFoodConfig, PetStageConfig } from '../../assets/scripts/core/types';

const kitten: PetStageConfig = {
  id: 'kitten',
  unlockShopLevel: 1,
  acceptedFoodIds: ['sheep_milk'],
  bonus: { type: 'bring_item', value: 1 }
};

const adolescentCat: PetStageConfig = {
  id: 'adolescent_cat',
  unlockShopLevel: 5,
  acceptedFoodIds: ['cat_food'],
  bonus: { type: 'coins_percent', value: 2 }
};

const adultCat: PetStageConfig = {
  id: 'adult_cat',
  unlockShopLevel: 10,
  acceptedFoodIds: ['cat_food'],
  bonus: { type: 'healing_percent', value: 5 }
};

const sheepMilk: PetFoodConfig = {
  id: 'sheep_milk',
  name: '羊奶',
  priceCoins: 5,
  intimacyGain: 3,
  allowedStages: ['kitten']
};

describe('pet', () => {
  it('feeds kitten with sheep milk and spends coins', () => {
    const state = { ...createInitialGameState(1000), coins: 10 };
    const result = feedPet(state, sheepMilk, kitten);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected kitten feeding to succeed');
    }
    expect(result.state.coins).toBe(5);
    expect(result.state.petIntimacy).toBe(3);
  });

  it('rejects food that does not belong to the pet stage', () => {
    const state = { ...createInitialGameState(1000), coins: 10 };
    const result = feedPet(state, sheepMilk, adolescentCat);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected wrong food to be rejected');
    }
    expect(result.reason).toBe('wrong_food');
  });

  it('syncs cat stage from the current shop level', () => {
    const state = { ...createInitialGameState(1000), shopLevel: 10 };
    const result = syncPetStage(state, [kitten, adolescentCat, adultCat]);

    expect(result.petStageId).toBe('adult_cat');
  });
});
