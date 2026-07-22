import { useEffect, useState } from 'react';
import { Box, Button, Dialog, HStack, IconButton, Portal, Text } from '@chakra-ui/react';
import { LuTriangleAlert, LuX } from 'react-icons/lu';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'danger' | 'default';
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setActionError(null);
  }, [open, title]);

  const handleConfirm = async () => {
    setLoading(true);
    setActionError(null);
    try {
      await onConfirm();
      onOpenChange({ open: false });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The action could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} role="alertdialog">
      <Portal>
      <Dialog.Backdrop bg="rgba(0, 0, 0, 0.58)" backdropFilter="blur(2px)" zIndex={1400} />
      <Dialog.Positioner zIndex={1500} p={{ base: 4, sm: 6 }}>
        <Dialog.Content width="full" maxW="440px" maxH="calc(100dvh - 32px)" overflowY="auto" bg="white" color="text.primary" borderRadius="md" borderWidth="1px" borderColor="border.strong" boxShadow="0 24px 64px rgba(0, 0, 0, 0.24)">
          <Dialog.Header>
            <HStack gap={3} pr={10}>
              {variant === 'danger' && <LuTriangleAlert color="var(--chakra-colors-danger)" aria-hidden="true" />}
              <Dialog.Title fontFamily="heading" fontWeight="650">{title}</Dialog.Title>
            </HStack>
          </Dialog.Header>
          <Dialog.Body>
            <Text color="text.secondary" lineHeight="1.6">{description}</Text>
            {actionError && (
              <Box role="alert" mt={4} p={3} bg="danger.light" borderWidth="1px" borderColor="danger" borderRadius="md">
                <Text color="danger" fontWeight="700" fontSize="sm">Action failed</Text>
                <Text color="text.secondary" mt={1} fontSize="sm" overflowWrap="anywhere">{actionError}</Text>
              </Box>
            )}
          </Dialog.Body>
          <Dialog.Footer flexDirection={{ base: 'column-reverse', sm: 'row' }} gap={3}>
            <Button width={{ base: 'full', sm: 'auto' }} variant="outline" onClick={() => onOpenChange({ open: false })} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              colorPalette={variant === 'danger' ? 'red' : 'green'}
              onClick={handleConfirm}
              loading={loading}
              width={{ base: 'full', sm: 'auto' }}
            >
              {confirmLabel}
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <IconButton aria-label="Close confirmation" variant="ghost" size="sm" position="absolute" top={3} right={3}>
              <LuX />
            </IconButton>
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
