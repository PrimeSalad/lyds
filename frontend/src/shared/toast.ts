import { createToaster } from '@chakra-ui/react';

export const toaster = createToaster({
  placement: 'bottom-end',
  overlap: true,
  gap: 16,
});

export const showToast = {
  success: (title: string) => toaster.create({ title, type: 'success' }),
  error: (title: string) => toaster.create({ title, type: 'error' }),
  info: (title: string) => toaster.create({ title, type: 'info' }),
};
