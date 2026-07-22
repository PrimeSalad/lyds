import { useState } from 'react';
import { Button, Dialog, HStack, IconButton, Text } from '@chakra-ui/react';
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

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange({ open: false });
    } catch {
      // The action owner provides the specific error feedback and keeps the dialog open.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} role="alertdialog">
      <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(2px)" />
      <Dialog.Positioner>
        <Dialog.Content mx={4} maxW="440px" borderRadius="md" borderWidth="1px" borderColor="border" boxShadow="xl">
          <Dialog.Header>
            <HStack gap={3} pr={10}>
              {variant === 'danger' && <LuTriangleAlert color="var(--chakra-colors-danger)" aria-hidden="true" />}
              <Dialog.Title fontFamily="heading" fontWeight="650">{title}</Dialog.Title>
            </HStack>
          </Dialog.Header>
          <Dialog.Body>
            <Text color="text.secondary" lineHeight="1.6">{description}</Text>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => onOpenChange({ open: false })} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              colorPalette={variant === 'danger' ? 'red' : 'green'}
              onClick={handleConfirm}
              loading={loading}
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
    </Dialog.Root>
  );
};
