import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        primary: {
          700: { value: '#166534' },
          600: { value: '#15803D' },
          500: { value: '#16A34A' },
          200: { value: '#BBF7D0' },
          100: { value: '#DCFCE7' },
          50: { value: '#F0FDF4' },
        },
        page: { bg: { value: '#F6F8F6' } },
        surface: { DEFAULT: { value: '#FFFFFF' }, muted: { value: '#F1F5F2' } },
        border: { DEFAULT: { value: '#D9E2DB' } },
        text: {
          primary: { value: '#172019' },
          secondary: { value: '#5B675E' },
          muted: { value: '#7B877E' },
        },
        info: { DEFAULT: { value: '#1D4ED8' }, light: { value: '#DBEAFE' } },
        warning: { DEFAULT: { value: '#92400E' }, light: { value: '#FEF3C7' } },
        danger: { DEFAULT: { value: '#B91C1C' }, light: { value: '#FEE2E2' } },
        success: { DEFAULT: { value: '#166534' }, light: { value: '#DCFCE7' } },
      },
      fonts: {
        heading: { value: "'Poppins', ui-sans-serif, system-ui, sans-serif" },
        body: { value: "'Questrial', ui-sans-serif, system-ui, sans-serif" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
