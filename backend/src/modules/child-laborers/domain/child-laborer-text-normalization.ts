const normalizedKey = (value: string) => value
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('en');

const natureOfWorkAliases = new Map<string, string>([
  ['artisanal fishing', 'Artisanal Fishing'],
  ['contruction (laborer)', 'Construction Labor'],
  ['construction (laborer)', 'Construction Labor'],
  ['copra farming', 'Copra Farming'],
  ['copra farming/ pag-aalaga ng kambing', 'Copra Farming'],
  ['farming (nagahakot ng palay)', 'Agricultural Labor'],
  ['helper', 'General Helper'],
  ['kasama sa paglukad', 'Copra Processing'],
  ['laborer', 'General Labor'],
  ['nagalabor sa tatay/ naupahan sa paglinis ng bahay, simbahan', 'General Labor'],
  ['nagapaupa', 'Casual Labor'],
  ['nagapaupa sa paghakot ng tubig', 'Water Hauling'],
  ['nagatinda', 'Retail Vending'],
  ['not specified in source workbook', 'Not Reported'],
  ['partime helper', 'Part-Time Helper'],
  ['partime helper sa poultry (nagakatay ng manok)', 'Poultry Processing'],
  ['partime helper sa water station (nasama sa pagdeliver/tagabuhat )', 'Water Delivery'],
  ['partime laborer', 'Part-Time Labor'],
  ['street food vending', 'Street Food Vending'],
  ['tanim', 'Agricultural Labor'],
]);

const parentOccupationAliases = new Map<string, string>([
  ['artisanal fishing/ technician', 'Artisanal Fisher and Technician'],
  ['fisherman/sc pensioner', 'Fisher and Senior Citizen Pensioner'],
  ['fisherman/domestic helper', 'Fisher and Domestic Worker'],
  ['copra farming', 'Copra Farmer'],
  ['copra famer', 'Copra Farmer'],
  ['copra farmer', 'Copra Farmer'],
  ['farmer', 'Farmer'],
  ['farmers', 'Farmer'],
  ['kasambahay', 'Domestic Worker'],
  ['farmer/ nagalukad', 'Farmer and Copra Processing Worker'],
  ['maglukad/farmer', 'Farmer and Copra Processing Worker'],
  ['bhw/ farmer', 'Barangay Health Worker and Farmer'],
  ['farmer/ brgy. sec.', 'Farmer and Barangay Secretary'],
  ['nagapaupa', 'Casual Laborer'],
  ['bhw/ nagalukad', 'Barangay Health Worker and Copra Processing Worker'],
  ['nagatanim/ nagalukad', 'Agricultural Laborer and Copra Processing Worker'],
  ['nagalukad', 'Copra Processing Worker'],
  ['farmer/ kasambahay', 'Farmer and Domestic Worker'],
  ['farmer/ househelper', 'Farmer and Domestic Worker'],
  ['farmer/sc pensioner', 'Farmer and Senior Citizen Pensioner'],
  ['rice farmer/ househelper', 'Rice Farmer and Domestic Worker'],
  ['construction worker', 'Construction Worker'],
  ['construction', 'Construction Worker'],
  ['on call laborer/ solo p', 'On-Call Laborer (Solo Parent)'],
  ['mananahi/ lukad', 'Seamstress and Copra Processing Worker'],
  ['pensioner', 'Pensioner'],
  ['laborer/ laundery women', 'Laborer and Laundry Worker'],
  ['street food vending /solo parent', 'Street Food Vendor (Solo Parent)'],
]);

const remarkAliases = new Map<string, string>([
  [
    'kasali sa 4ps ang kanilang family',
    'The household is a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).',
  ],
  [
    'kasali ang family sa 4ps',
    'The household is a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).',
  ],
  [
    'kasali sa 4ps',
    'The household is a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).',
  ],
  [
    'naoperahan ang mata ng lolo. napadalhan kahit papano ng nanay',
    "The child's grandfather underwent eye surgery, and the mother provides occasional financial support.",
  ],
  [
    'ang tatay ay nakikigamit lang ng bangka ng iba dahil nasira ang sarili nilang bangka',
    "The father currently borrows another fisher's boat because the family's boat is damaged.",
  ],
  [
    'may sarili ng pamilya (may isang anak)',
    'The individual has a family and one child.',
  ],
  [
    'yellow- kasama na dati',
    'Previously included in the program and classified under the Yellow category.',
  ],
  [
    'lolo at lola na ang nag-aalaga simula pagkababy',
    'The child has been under the care of the grandparents since infancy.',
  ],
  [
    'separated ang parents/ hindi kasali sa 4ps',
    'The parents are separated, and the household is not a 4Ps beneficiary.',
  ],
  [
    'hindi kasali sa 4ps',
    'The household is not a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).',
  ],
  [
    'hiwalay ang parents/may bagong partner ang nanay/ isa mga kapatid ay kasali sa 4ps',
    'The parents are separated; the mother has a new partner, and one sibling is a 4Ps beneficiary.',
  ],
]);

const normalizedValue = (value: string, aliases: Map<string, string>) => {
  const compact = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return aliases.get(normalizedKey(compact)) ?? compact;
};

export const normalizeNatureOfWork = (value: string) => normalizedValue(value, natureOfWorkAliases);

export const normalizeParentGuardianOccupation = (value: string | undefined) => {
  if (!value?.trim()) return null;
  return normalizedValue(value, parentOccupationAliases);
};

export const normalizeChildLaborerRemarks = (value: string | undefined) => {
  if (!value?.trim()) return null;
  return normalizedValue(value, remarkAliases);
};
