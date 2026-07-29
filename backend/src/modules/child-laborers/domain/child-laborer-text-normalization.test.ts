import { describe, expect, it } from 'vitest';
import {
  normalizeChildLaborerRemarks,
  normalizeNatureOfWork,
  normalizeParentGuardianOccupation,
} from './child-laborer-text-normalization';

describe('child laborer text normalization', () => {
  it('uses one professional nature-of-work category for imported variants', () => {
    expect(normalizeNatureOfWork('ARTISANAL FISHING')).toBe('Artisanal Fishing');
    expect(normalizeNatureOfWork('Copra Farming/ Pag-aalaga ng kambing')).toBe('Copra Farming');
    expect(normalizeNatureOfWork('Farming (Nagahakot ng palay)')).toBe('Agricultural Labor');
    expect(normalizeNatureOfWork('Tanim')).toBe('Agricultural Labor');
  });

  it('merges equivalent parent occupation labels and corrects wording', () => {
    expect(normalizeParentGuardianOccupation('Copra Famer')).toBe('Copra Farmer');
    expect(normalizeParentGuardianOccupation('Farmers')).toBe('Farmer');
    expect(normalizeParentGuardianOccupation('Farmer/ Kasambahay')).toBe('Farmer and Domestic Worker');
    expect(normalizeParentGuardianOccupation('Farmer/ Househelper')).toBe('Farmer and Domestic Worker');
    expect(normalizeParentGuardianOccupation('   ')).toBeNull();
  });

  it('turns equivalent field notes into professional sentences without inventing blanks', () => {
    expect(normalizeChildLaborerRemarks('Kasali ang family sa 4Ps')).toBe(
      'The household is a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).',
    );
    expect(normalizeChildLaborerRemarks('Hindi kasali sa 4Ps')).toBe(
      'The household is not a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).',
    );
    expect(normalizeChildLaborerRemarks('   ')).toBeNull();
    expect(normalizeChildLaborerRemarks(undefined)).toBeNull();
  });

  it('preserves an unrecognized professional value after whitespace cleanup', () => {
    expect(normalizeNatureOfWork('  Automotive   Repair Assistant ')).toBe('Automotive Repair Assistant');
  });
});
