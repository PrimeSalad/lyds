export const validateAssemblyRules = (attended: boolean, count: number): string | null => {
  if (!attended && count !== 0) {
    return 'Assembly count must be 0 if not attended.';
  }
  if (attended && count < 1) {
    return 'Assembly count must be at least 1 if attended.';
  }
  return null;
};
