import { createToaster } from '@chakra-ui/react';

export const toaster = createToaster({
  placement: 'top',
  overlap: true,
  gap: 12,
  duration: 4500,
  max: 4,
});

type ToastDetails = {
  title: string;
  description?: string;
};

const normalizeToast = (details: string | ToastDetails): ToastDetails =>
  typeof details === 'string' ? { title: details } : details;

export const showToast = {
  success: (details: string | ToastDetails) => toaster.create({ ...normalizeToast(details), type: 'success' }),
  error: (details: string | ToastDetails) => toaster.create({ ...normalizeToast(details), type: 'error', duration: 6500 }),
  info: (details: string | ToastDetails) => toaster.create({ ...normalizeToast(details), type: 'info' }),
  warning: (details: string | ToastDetails) => toaster.create({ ...normalizeToast(details), type: 'warning' }),
};
