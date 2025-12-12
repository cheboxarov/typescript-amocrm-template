/**
 * Тема виджета
 */

export const theme = {
  // Цвета
  colors: {
    primary: '#339DCC', // Основной цвет amoCRM
    primaryHover: '#2A8AB3',
    success: '#52C41A',
    error: '#FF4D4F',
    warning: '#FAAD14',
    info: '#1890FF',

    // Текст
    textPrimary: '#333333',
    textSecondary: '#666666',
    textDisabled: '#999999',
    textLight: '#FFFFFF',

    // Фон
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F5F5F5',
    bgHover: '#FAFAFA',
    bgDisabled: '#F0F0F0',

    // Границы
    border: '#D9D9D9',
    borderLight: '#E8E8E8',
    borderDark: '#BFBFBF',

    // Специфичные цвета
    incoming: '#52C41A',
    outgoing: '#1890FF',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },

  // Размеры
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Радиусы
  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
  },

  // Тени
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.15)',
  },

  // Шрифты
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Courier New", Courier, monospace',
  },

  // Размеры шрифтов
  fontSizes: {
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    xxl: '20px',
  },

  // Веса шрифтов
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Переходы
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },

  // Breakpoints
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
  },
};

export type Theme = typeof theme;
