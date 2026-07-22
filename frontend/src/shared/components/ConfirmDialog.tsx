import { Button, Text, Dialog } from '@chakra-ui/react';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
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
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text>{description}</Text>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => onOpenChange({ open: false })}>
              {cancelLabel}
            </Button>
            <Button
              colorPalette={variant === 'danger' ? 'red' : 'green'}
              onClick={() => {
                onConfirm();
                onOpenChange({ open: false });
              }}
            >
              {confirmLabel}
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
