import React, { useState, useEffect } from 'react';
import { Button, Typography, Progress, Tooltip, Alert } from 'antd';
import { LinkOutlined, CloseCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useAttachNextStatus } from '@hooks/useAttachNextStatus';
import { useAmoCRMContext } from '@hooks/useAmoCRMContext';
import { theme } from '@styles/theme';
import { logger } from '@utils/logger';

const { Text } = Typography;

const ButtonContainer = styled.div`
  padding: 4px 0;
  background-color: transparent;
  border-radius: 0;
  box-shadow: none;
`;

const StatusIndicator = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: ${props =>
    props.$active ? `${theme.colors.success}10` : 'transparent'};
  border-radius: 4px;
  border: 1px solid
    ${props => (props.$active ? theme.colors.success : theme.colors.borderLight)};
  margin-bottom: 4px;
`;

const StatusIcon = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => (props.$active ? theme.colors.success : theme.colors.border)};
  flex-shrink: 0;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const StatusText = styled(Text)<{ $active: boolean }>`
  flex: 1;
  font-size: 12px;
  font-weight: ${theme.fontWeights.medium};
  color: ${props => (props.$active ? theme.colors.success : theme.colors.textSecondary)};
  line-height: 1.3;
`;

const TimerContainer = styled.div`
  margin-top: 4px;
  padding: 4px 6px;
  background-color: ${theme.colors.bgSecondary};
  border-radius: 3px;
  border: 1px solid ${theme.colors.borderLight};
`;

const TimerText = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
  line-height: 1.2;
`;

interface AttachNextButtonProps {
  dealId: string;
  contactId?: string;
  onAttachNext?: (dealId: string) => Promise<void>;
}

const AttachNextButton: React.FC<AttachNextButtonProps> = ({
  dealId,
  contactId: propContactId,
  onAttachNext
}) => {
  const { contactId: contextContactId } = useAmoCRMContext();
  const actualContactId = propContactId || contextContactId;
  const { isActive, activate, cancel, getRemainingTime, dealId: activeDealId, ttlSeconds } =
    useAttachNextStatus(actualContactId);
  const [loading, setLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

  // Проверка инициализации store
  useEffect(() => {
    // Если хук вернул undefined значения, значит store не инициализирован
    if (isActive === undefined || getRemainingTime === undefined) {
      const errorContext = {
        component: 'AttachNextButton',
        dealId,
        contactId: actualContactId || null,
        isActiveUndefined: isActive === undefined,
        getRemainingTimeUndefined: getRemainingTime === undefined,
        activeDealId: activeDealId || null,
        ttlSeconds: ttlSeconds || null,
      };
      
      logger.error('Ошибка инициализации AttachNextButton - store не инициализирован', errorContext, new Error('Store не инициализирован'));
      setInitError('Ошибка инициализации компонента. Попробуйте перезагрузить страницу.');
    } else {
      if (initError) {
        logger.info('AttachNextButton успешно инициализирован', {
          component: 'AttachNextButton',
          dealId,
          contactId: actualContactId || null,
          isActive: isActive || false,
          activeDealId: activeDealId || null,
        });
        setInitError(null);
      }
    }
  }, [isActive, getRemainingTime, dealId, actualContactId, activeDealId, ttlSeconds, initError]);

  // Обновление таймера каждую секунду
  useEffect(() => {
    if (!isActive) {
      setRemainingSeconds(0);
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;

    const updateTimer = () => {
      try {
        const remaining = getRemainingTime();
        setRemainingSeconds(remaining);

        if (remaining <= 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch (error) {
        const errorContext = {
          component: 'AttachNextButton',
          action: 'updateTimer',
          dealId,
          contactId: actualContactId || null,
          isActive: isActive || false,
          errorType: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };
        
        logger.error('Ошибка обновления таймера в AttachNextButton', errorContext, error instanceof Error ? error : new Error(String(error)));
        
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    try {
      updateTimer(); // Первый вызов сразу
      intervalId = setInterval(updateTimer, 1000);
    } catch (error) {
      const errorContext = {
        component: 'AttachNextButton',
        action: 'startTimer',
        dealId,
        contactId: actualContactId || null,
        isActive: isActive || false,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
      
      logger.error('Ошибка запуска таймера в AttachNextButton', errorContext, error instanceof Error ? error : new Error(String(error)));
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, getRemainingTime]);

  const handleToggle = async () => {
    // Проверка на ошибки инициализации
    if (initError) {
      logger.error('Невозможно переключить AttachNextButton - ошибка инициализации', {
        component: 'AttachNextButton',
        dealId,
        contactId: actualContactId || null,
        initError,
        isActive: isActive || false,
        activeDealId: activeDealId || null,
      }, new Error('Ошибка инициализации'));
      return;
    }

    setLoading(true);
    try {
      const action = isActive && activeDealId === dealId ? 'cancel' : 'activate';
      
      if (isActive && activeDealId === dealId) {
        await cancel();
      } else {
        if (onAttachNext) {
          await onAttachNext(dealId);
        } else {
          await activate(dealId, ttlSeconds || 600);
        }
      }
      
      logger.debug('AttachNextButton успешно переключен', {
        component: 'AttachNextButton',
        action,
        dealId,
        contactId: actualContactId || null,
      });
    } catch (error) {
      const errorContext = {
        component: 'AttachNextButton',
        action: 'handleToggle',
        dealId,
        contactId: actualContactId || null,
        isActive: isActive || false,
        activeDealId: activeDealId || null,
        ttlSeconds: ttlSeconds || null,
        hasOnAttachNext: !!onAttachNext,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
      
      logger.error('Ошибка переключения AttachNextButton', errorContext, error instanceof Error ? error : new Error(String(error)));
      
      // Показываем пользователю понятное сообщение об ошибке
      if (error instanceof Error && error.message.includes('Store не инициализирован')) {
        setInitError('Сервис временно недоступен. Попробуйте перезагрузить страницу.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = isActive && activeDealId === dealId
    ? ((ttlSeconds || 600) > 0 ? (remainingSeconds / (ttlSeconds || 600)) * 100 : 0)
    : 0;

  const isActiveForThisDeal = isActive && activeDealId === dealId;

  return (
    <ButtonContainer>
      {initError && (
        <Alert
          message="Ошибка инициализации"
          description={initError}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: '12px' }}
        />
      )}

      <StatusIndicator $active={isActiveForThisDeal}>
        <StatusIcon $active={isActiveForThisDeal} />
        <StatusText $active={isActiveForThisDeal}>
          {isActiveForThisDeal ? 'Режим автопривязки активен' : 'Режим автопривязки не активен'}
        </StatusText>
      </StatusIndicator>

      {isActiveForThisDeal ? (
        <>
          <TimerContainer>
            <TimerText>
              <ClockCircleOutlined />
              <Text>Осталось времени: {formatTime(remainingSeconds)}</Text>
            </TimerText>
            <Progress
              percent={progressPercent}
              showInfo={false}
              strokeColor={theme.colors.success}
              trailColor={theme.colors.bgPrimary}
            />
          </TimerContainer>

          <Tooltip title="Отменить автоматическую привязку следующего звонка">
            <Button
              block
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleToggle}
              loading={loading}
              disabled={!!initError}
              style={{ marginTop: '12px' }}
            >
              Отменить автопривязку
            </Button>
          </Tooltip>
        </>
      ) : (
        <Tooltip title={
          isActive && activeDealId !== dealId
            ? `⚠️ Режим уже активен для другой сделки. Нажмите для переноса на эту сделку`
            : `Следующий звонок будет автоматически привязан к этой сделке (${Math.floor((ttlSeconds || 600) / 60)} мин)`
        }>
          <Button
            block
            type={isActive && activeDealId !== dealId ? "warning" : "primary"}
            icon={<LinkOutlined />}
            onClick={handleToggle}
            loading={loading}
            disabled={!!initError}
            style={{ marginTop: '8px' }}
          >
            {isActive && activeDealId !== dealId
              ? 'Перенести на эту сделку'
              : 'Привязать следующий звонок'}
          </Button>
        </Tooltip>
      )}

      {isActive && activeDealId !== dealId && (
        <Text type="warning" style={{ display: 'block', marginTop: theme.spacing.sm, fontSize: theme.fontSizes.xs }}>
          ⚠️ Режим уже активен для другой сделки. Нажмите "Перенести на эту сделку" чтобы изменить привязку.
        </Text>
      )}
    </ButtonContainer>
  );
};

export default AttachNextButton;
