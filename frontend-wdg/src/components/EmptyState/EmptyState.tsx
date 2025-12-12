import React from 'react';
import { Empty } from 'antd';
import styled from 'styled-components';
import { theme } from '@styles/theme';

interface EmptyStateProps {
  description?: string;
  image?: React.ReactNode;
}

const EmptyContainer = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
`;

const EmptyState: React.FC<EmptyStateProps> = ({ description, image }) => {
  return (
    <EmptyContainer>
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={description || 'Нет данных'}
      />
    </EmptyContainer>
  );
};

export default React.memo(EmptyState);
