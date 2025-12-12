import React, { useMemo } from 'react';
import { Select, Button, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useDeals } from '@hooks/useDeals';
import { useAmoCRMContext } from '@hooks/useAmoCRMContext';
import { theme } from '@styles/theme';
import EmptyState from '@components/EmptyState';
import Loader from '@components/Loader';

const { Option, OptGroup } = Select;

interface DealSelectorProps {
  onSelect: (dealId: string) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const SelectorContainer = styled.div`
  padding: ${theme.spacing.sm} 0;
  background-color: ${theme.colors.bgPrimary};
`;

const StyledSelect = styled(Select)`
  width: 100%;
  margin-bottom: ${theme.spacing.sm};

  .ant-select-selector {
    min-height: 40px;
  }
`;

const DealOption = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const DealName = styled.div`
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.textPrimary};
`;

const DealMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const StatusBadge = styled.span<{ $color?: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$color || theme.colors.border};
  margin-right: ${theme.spacing.xs};
`;

const DealSelector: React.FC<DealSelectorProps> = ({ onSelect, onCancel, loading = false }) => {
  const { contactId } = useAmoCRMContext();
  const { deals, loading: dealsLoading, search, searchQuery } = useDeals(contactId);
  const [selectedDealId, setSelectedDealId] = React.useState<string | undefined>();

  const handleSelect = () => {
    if (selectedDealId) {
      onSelect(selectedDealId);
    }
  };

  // Группировка сделок по воронке (мемоизация для оптимизации)
  const groupedDeals = useMemo(() => {
    return deals.reduce((acc, deal) => {
      const pipeline = deal.pipeline || 'Без воронки';
      if (!acc[pipeline]) {
        acc[pipeline] = [];
      }
      acc[pipeline].push(deal);
      return acc;
    }, {} as Record<string, typeof deals>);
  }, [deals]);

  if (dealsLoading) {
    return (
      <SelectorContainer>
        <Loader size="small" tip="Загрузка сделок..." />
      </SelectorContainer>
    );
  }

  if (deals.length === 0) {
    return (
      <SelectorContainer>
        <EmptyState description="У контакта нет сделок" />
        {onCancel && (
          <Button block onClick={onCancel}>
            Отмена
          </Button>
        )}
      </SelectorContainer>
    );
  }

  return (
    <SelectorContainer>
      <Input
        placeholder="Поиск сделки..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={e => search(e.target.value)}
        style={{ marginBottom: theme.spacing.sm }}
      />

      <StyledSelect
        showSearch
        placeholder="Выберите сделку"
        value={selectedDealId}
        onChange={setSelectedDealId}
        filterOption={false}
      >
        {Object.entries(groupedDeals).map(([pipeline, pipelineDeals]) => (
          <OptGroup key={pipeline} label={pipeline}>
            {pipelineDeals.map(deal => (
              <Option key={deal.id} value={deal.id}>
                <DealOption>
                  <DealName>{deal.name}</DealName>
                  <DealMeta>
                    {deal.status && (
                      <span>
                        <StatusBadge $color={deal.statusColor} />
                        {deal.status}
                      </span>
                    )}
                    {deal.price && <span>{deal.price} ₽</span>}
                  </DealMeta>
                </DealOption>
              </Option>
            ))}
          </OptGroup>
        ))}
      </StyledSelect>

      <Space>
        <Button type="primary" onClick={handleSelect} disabled={!selectedDealId} loading={loading}>
          Привязать
        </Button>
        {onCancel && (
          <Button onClick={onCancel} disabled={loading}>
            Отмена
          </Button>
        )}
      </Space>
    </SelectorContainer>
  );
};

export default DealSelector;
