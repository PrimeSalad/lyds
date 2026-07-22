import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  globalCss: {
    html: {
      colorPalette: 'green',
      bg: 'page.bg',
    },
    body: {
      bg: 'page.bg',
      color: 'text.primary',
    },
    '::selection': {
      bg: 'primary.100',
      color: 'primary.800',
    },
  },
  theme: {
    tokens: {
      colors: {
        primary: {
          900: { value: '#123B27' },
          800: { value: '#14532D' },
          700: { value: '#166534' },
          600: { value: '#15803D' },
          500: { value: '#16A34A' },
          400: { value: '#22C55E' },
          300: { value: '#86EFAC' },
          200: { value: '#BBF7D0' },
          100: { value: '#DCFCE7' },
          50: { value: '#F0FDF4' },
        },
        page: { bg: { value: '#F4F6F5' } },
        surface: {
          DEFAULT: { value: '#FFFFFF' },
          muted: { value: '#F7F9F8' },
          raised: { value: '#FFFFFF' },
        },
        border: {
          DEFAULT: { value: '#DCE3DF' },
          strong: { value: '#C8D2CC' },
        },
        text: {
          primary: { value: '#17221C' },
          secondary: { value: '#536159' },
          muted: { value: '#6F7C74' },
        },
        info: { DEFAULT: { value: '#1D4ED8' }, light: { value: '#EFF6FF' } },
        warning: { DEFAULT: { value: '#92400E' }, light: { value: '#FFFBEB' } },
        danger: { DEFAULT: { value: '#B91C1C' }, light: { value: '#FEF2F2' } },
        success: { DEFAULT: { value: '#166534' }, light: { value: '#F0FDF4' } },
      },
      fonts: {
        heading: { value: "Inter, 'Segoe UI', ui-sans-serif, system-ui, sans-serif" },
        body: { value: "Inter, 'Segoe UI', ui-sans-serif, system-ui, sans-serif" },
      },
      shadows: {
        panel: { value: '0 1px 2px rgba(18, 59, 39, 0.05), 0 8px 24px rgba(18, 59, 39, 0.04)' },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
