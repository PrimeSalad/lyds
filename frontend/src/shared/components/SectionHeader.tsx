import { Flex, Text } from '@chakra-ui/react';

export const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <Flex align="center" mb={4} mt={6}>
    <Text
      pl={3}
      borderLeft="4px solid"
      borderColor="primary.600"
      fontFamily="heading"
      fontWeight="500"
      fontSize="lg"
      color="text.primary"
    >
      {children}
    </Text>
  </Flex>
);
