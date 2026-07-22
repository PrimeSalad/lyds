import { Flex, Text } from '@chakra-ui/react';

export const SectionHeader = ({ children, mt = 8 }: { children: React.ReactNode; mt?: number }) => (
  <Flex align="center" mb={4} mt={mt}>
    <Text
      fontFamily="heading"
      fontWeight="700"
      fontSize="md"
      color="text.primary"
    >
      {children}
    </Text>
  </Flex>
);
