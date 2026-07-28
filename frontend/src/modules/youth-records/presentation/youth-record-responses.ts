export type YesNoAnswer = 'YES' | 'NO' | '';

export const booleanToAnswer = (value: boolean | null | undefined): YesNoAnswer => (
  value === true ? 'YES' : value === false ? 'NO' : ''
);

export const answerToBoolean = (value: YesNoAnswer): boolean | null => (
  value === 'YES' ? true : value === 'NO' ? false : null
);
