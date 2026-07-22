import { HStack, IconButton, Portal, Stack, Toast, Toaster } from '@chakra-ui/react';
import { LuX } from 'react-icons/lu';
import { toaster } from '../toast';

export const AppToaster = () => (
  <Portal>
    <Toaster toaster={toaster} insetInline={{ base: 4, md: 6 }} mt={{ base: 2, md: 4 }} zIndex={2000}>
      {(toast) => (
        <Toast.Root
          width={{ base: 'calc(100vw - 32px)', sm: '380px' }}
          borderWidth="1px"
          borderColor="border"
          borderRadius="md"
          boxShadow="panel"
          bg="surface"
        >
          <HStack align="flex-start" gap={3} width="full">
            <Toast.Indicator mt="2px" />
            <Stack gap={1} flex="1" minW={0}>
              {toast.title && <Toast.Title fontWeight="600">{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description color="text.secondary">{toast.description}</Toast.Description>
              )}
            </Stack>
            <Toast.CloseTrigger asChild>
              <IconButton aria-label="Dismiss notification" variant="ghost" size="sm">
                <LuX />
              </IconButton>
            </Toast.CloseTrigger>
          </HStack>
        </Toast.Root>
      )}
    </Toaster>
  </Portal>
);
