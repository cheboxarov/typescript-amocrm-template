import React from 'react';
import { Spin } from 'antd';
import styled from 'styled-components';
import { theme } from '@styles/theme';

interface LoaderProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  fullHeight?: boolean;
}

const LoaderContainer = styled.div<{ $fullHeight?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  min-height: ${props => (props.$fullHeight ? '200px' : 'auto')};
`;

const LoaderText = styled.div`
  margin-top: ${theme.spacing.md};
  color: ${theme.colors.textSecondary};
  font-size: ${theme.fontSizes.sm};
`;

const Loader: React.FC<LoaderProps> = ({ size = 'default', tip, fullHeight = false }) => {
  return (
    <LoaderContainer $fullHeight={fullHeight}>
      <Spin size={size} />
      {tip && <LoaderText>{tip}</LoaderText>}
    </LoaderContainer>
  );
};

export default React.memo(Loader);
