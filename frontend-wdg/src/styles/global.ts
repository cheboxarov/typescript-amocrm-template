import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${theme.fonts.primary};
    font-size: ${theme.fontSizes.md};
    color: ${theme.colors.textPrimary};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Переопределение стилей Ant Design */
  .ant-btn-primary {
    background-color: ${theme.colors.primary};
    border-color: ${theme.colors.primary};

    &:hover, &:focus {
      background-color: ${theme.colors.primaryHover};
      border-color: ${theme.colors.primaryHover};
    }
  }

  .ant-select-focused .ant-select-selector,
  .ant-select-selector:focus,
  .ant-select-selector:active,
  .ant-select-open .ant-select-selector {
    border-color: ${theme.colors.primary} !important;
    box-shadow: 0 0 0 2px rgba(51, 157, 204, 0.2) !important;
  }

  /* Скроллбар */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.bgSecondary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: ${theme.borderRadius.md};

    &:hover {
      background: ${theme.colors.borderDark};
    }
  }
`;
