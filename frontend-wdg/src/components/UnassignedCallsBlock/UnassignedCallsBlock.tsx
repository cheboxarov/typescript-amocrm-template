import React from 'react';
import { Button, Typography, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useUnassignedCalls } from '@hooks/useUnassignedCalls';
import { useAmoCRMContext } from '@hooks/useAmoCRMContext';
import { theme } from '@styles/theme';
import CallCard from '@components/CallCard';
import EmptyState from '@components/EmptyState';
import Loader from '@components/Loader';

const { Title } = Typography;

const BlockContainer = styled.div`
  padding: 4px 0;
  background-color: transparent;
  border-radius: 0;
  box-shadow: none;
`;

const BlockHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid ${theme.colors.borderLight};
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.textPrimary};
`;

const CallsList = styled.div`
  max-height: 200px;
  overflow-y: auto;

  /* Компактный скроллбар */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.borderLight};
    border-radius: 2px;

    &:hover {
      background: ${theme.colors.borderDark};
    }
  }
`;

const LoadMoreButton = styled(Button)`
  width: 100%;
  margin-top: ${theme.spacing.md};
`;

const UnassignedCallsBlock: React.FC = () => {
  const { contactId } = useAmoCRMContext();
  const { calls, loading, error, hasMore, loadMore, refresh, assignCall, unassignCall } =
    useUnassignedCalls(contactId);

  if (loading && calls.length === 0) {
    return (
      <BlockContainer>
        <Loader fullHeight tip="Загрузка звонков..." />
      </BlockContainer>
    );
  }

  if (error && calls.length === 0) {
    return (
      <BlockContainer>
        <EmptyState description={error} />
        <Button type="primary" block onClick={refresh} icon={<ReloadOutlined />} style={{ marginTop: '12px' }}>
          Повторить попытку
        </Button>
      </BlockContainer>
    );
  }

  return (
    <BlockContainer>
      <BlockHeader>
        <HeaderTitle>
          <Title level={4} style={{ margin: 0 }}>
            Неразобранные звонки
          </Title>
          {calls.length > 0 && (
            <Badge
              count={calls.length}
              style={{
                backgroundColor: theme.colors.primary,
              }}
            />
          )}
        </HeaderTitle>
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={refresh}
          loading={loading}
          title="Обновить список"
        />
      </BlockHeader>

      {calls.length === 0 ? (
        <EmptyState description="Нет неразобранных звонков" />
      ) : (
        <>
          <CallsList>
            {calls.map(call => (
              <CallCard
                key={call.id}
                call={call}
                onAssign={assignCall}
                onUnassign={unassignCall}
                showDealSelector
              />
            ))}
          </CallsList>

          {hasMore && (
            <LoadMoreButton type="dashed" onClick={loadMore} loading={loading}>
              Загрузить еще
            </LoadMoreButton>
          )}
        </>
      )}
    </BlockContainer>
  );
};

export default UnassignedCallsBlock;
