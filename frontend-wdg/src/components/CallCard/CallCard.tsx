import React, { useState } from 'react';
import { Card, Button, Space, Typography, Tag, Tooltip } from 'antd';
import { PhoneOutlined, PlayCircleOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { Call } from '../../types/models';
import { theme } from '@styles/theme';
import DealSelector from '@components/DealSelector';

const { Text } = Typography;

interface CallCardProps {
  call: Call;
  onAssign: (callId: string, dealId: string) => Promise<void>;
  onUnassign?: (callId: string) => Promise<void>;
  showDealSelector?: boolean;
}

const StyledCard = styled(Card)`
  margin-bottom: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
  border: 1px solid ${theme.colors.borderLight};
  transition: all ${theme.transitions.normal};
  background-color: ${theme.colors.bgPrimary};

  &:hover {
    box-shadow: ${theme.shadows.md};
    border-color: ${theme.colors.primary};
    transform: translateY(-1px);
  }

  .ant-card-body {
    padding: ${theme.spacing.lg};
  }
`;

const CallHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${theme.colors.bgSecondary};
`;

const CallInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const CallType = styled(Tag)<{ $type: 'incoming' | 'outgoing' }>`
  background-color: ${props =>
    props.$type === 'incoming' ? `${theme.colors.incoming}15` : `${theme.colors.outgoing}15`};
  color: ${props =>
    props.$type === 'incoming' ? theme.colors.incoming : theme.colors.outgoing};
  border: 1px solid ${props =>
    props.$type === 'incoming' ? theme.colors.incoming : theme.colors.outgoing};
  margin: 0;
  font-weight: ${theme.fontWeights.medium};
  border-radius: ${theme.borderRadius.md};
  padding: 0 8px;
`;

const CallDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${theme.spacing.sm} ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textPrimary};
  
  .label {
    color: ${theme.colors.textSecondary};
    font-weight: ${theme.fontWeights.medium};
    min-width: 70px;
  }
`;

const CallCard: React.FC<CallCardProps> = ({
  call,
  onAssign,
  onUnassign,
  showDealSelector = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const handleAssign = async (dealId: string) => {
    setLoading(true);
    try {
      await onAssign(call.id, dealId);
      setShowSelector(false);
    } catch (error) {
      console.error('Error assigning call:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!onUnassign) return;

    setLoading(true);
    try {
      await onUnassign(call.id);
    } catch (error) {
      console.error('Error unassigning call:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string) => {
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseInt(parts[2], 10);

      if (hours > 0) {
        return `${hours}ч ${minutes}м ${seconds}с`;
      }
      if (minutes > 0) {
        return `${minutes}м ${seconds}с`;
      }
      return `${seconds}с`;
    }
    return duration;
  };

  return (
    <StyledCard>
      <CallHeader>
        <CallInfo>
          <PhoneOutlined style={{ fontSize: '18px', color: theme.colors.primary }} />
          <CallType $type={call.type}>
            {call.type === 'incoming' ? 'Входящий' : 'Исходящий'}
          </CallType>
          <Text strong>{formatDuration(call.duration)}</Text>
        </CallInfo>
        <Text type="secondary" style={{ fontSize: theme.fontSizes.sm }}>
          {call.date}
        </Text>
      </CallHeader>

      <CallDetails>
        <DetailRow>
          <span className="label">Телефон:</span>
          <Text strong copyable={!!call.phone}>{call.phone || 'Не указан'}</Text>
        </DetailRow>
        <DetailRow>
          <span className="label">Менеджер:</span>
          <Text>{call.userName}</Text>
        </DetailRow>
        <DetailRow>
          <span className="label">Статус:</span>
          <Text>{call.status}</Text>
        </DetailRow>
        {call.provider && (
          <DetailRow>
            <span className="label">Провайдер:</span>
            <Text>{call.provider}</Text>
          </DetailRow>
        )}
      </CallDetails>

      <Space wrap size="small" style={{ marginTop: '12px', gap: '8px' }}>
        {call.recordingUrl && (
          <>
            <Tooltip title="Прослушать запись">
              <Button
                type="link"
                icon={<PlayCircleOutlined />}
                href={call.recordingUrl}
                target="_blank"
                size="small"
              >
                Прослушать
              </Button>
            </Tooltip>
            {call.downloadUrl && (
              <Tooltip title="Скачать запись">
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  href={call.downloadUrl}
                  download
                  size="small"
                >
                  Скачать
                </Button>
              </Tooltip>
            )}
          </>
        )}

        {showDealSelector && !call.dealId && (
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={() => setShowSelector(!showSelector)}
            loading={loading}
            size="small"
          >
            Привязать к сделке
          </Button>
        )}

        {call.dealId && onUnassign && (
          <Button onClick={handleUnassign} loading={loading} size="small" danger>
            Снять привязку
          </Button>
        )}
      </Space>

      {showSelector && showDealSelector && (
        <div style={{ marginTop: '16px' }}>
          <DealSelector
            onSelect={handleAssign}
            onCancel={() => setShowSelector(false)}
            loading={loading}
          />
        </div>
      )}
    </StyledCard>
  );
};

export default React.memo(CallCard);
