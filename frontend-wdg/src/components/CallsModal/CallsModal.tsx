import React, { useCallback } from 'react';
import { Modal, Badge } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useUnassignedCallsFromDOM } from '@hooks/useUnassignedCallsFromDOM';
import { useAmoCRMContext } from '@hooks/useAmoCRMContext';
import { callsAPI } from '@services/callsApi';
import { theme } from '@styles/theme';
import CallCard from '@components/CallCard';
import EmptyState from '@components/EmptyState';
import Loader from '@components/Loader';
import { logger } from '@utils/logger';
import { Call } from '@types/models';

interface CallsModalProps {
  visible: boolean;
  onClose: () => void;
}

const ModalContent = styled.div`
  max-height: 70vh;
  overflow-y: auto;
`;

const ModalTitleContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 20px;
`;

interface UnassignedCall extends Call {
  hash: string;
  assignment?: any;
}

const CallsModal: React.FC<CallsModalProps> = ({ visible, onClose }) => {
  const { contactId } = useAmoCRMContext();
  const { calls, loading, error, refresh } = useUnassignedCallsFromDOM(contactId);

  React.useEffect(() => {
    if (visible) {
      logger.info('Модальное окно звонков открыто', {
        component: 'CallsModal',
        contactId: contactId || undefined,
        callsCount: calls?.length || 0,
      });
    }
  }, [visible, contactId, calls]);

  const handleClose = () => {
    logger.debug('Закрытие модального окна звонков', { component: 'CallsModal' });
    onClose();
  };

  const handleAssign = useCallback(async (callId: string, dealId: string) => {
    if (!contactId) {
      logger.error('ID контакта не определен для привязки звонка', {
        component: 'CallsModal',
        callId,
        dealId
      });
      return;
    }

    const call = calls.find((c: UnassignedCall) => c.id === callId) as UnassignedCall | undefined;
    if (!call) {
      logger.error('Звонок не найден для привязки', {
        component: 'CallsModal',
        callId,
        dealId
      });
      return;
    }

    try {
      logger.info('Начало привязки звонка к сделке', {
        component: 'CallsModal',
        callId,
        dealId,
        hash: call.hash,
        hasLink: !!call.link
      });

      const durationMatch = call.duration.match(/(\d+):(\d+)(?::(\d+))?/);
      let durationSeconds: number | undefined;
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0', 10);
        const minutes = parseInt(durationMatch[2] || '0', 10);
        const seconds = parseInt(durationMatch[3] || '0', 10);
        durationSeconds = hours * 3600 + minutes * 60 + seconds;
      }

      await callsAPI.assignCallByHash(
        call.hash,
        contactId,
        dealId,
        {
          noteType: call.type,
          phone: call.phone || undefined,
          durationSeconds,
          link: call.link || undefined,
          source: call.provider || undefined,
          reason: 'manual_assignment_from_modal'
        }
      );

      logger.info('Звонок успешно привязан к сделке', {
        component: 'CallsModal',
        callId,
        dealId
      });

      await refresh();
    } catch (err) {
      logger.error('Ошибка при привязке звонка к сделке', {
        component: 'CallsModal',
        callId,
        dealId,
        error: err instanceof Error ? err.message : String(err)
      }, err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [calls, contactId, refresh]);

  const renderContent = () => {
    if (loading && calls.length === 0) {
      return <Loader fullHeight tip="Загрузка звонков..." />;
    }

    if (error && calls.length === 0) {
      return (
        <ErrorContainer>
          <EmptyState description={error} />
        </ErrorContainer>
      );
    }

    if (!calls || calls.length === 0) {
      return <EmptyState description="Нет неразобранных звонков" />;
    }

    return (
      <div className="calls-modal-list" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
        {calls.map((call: UnassignedCall) => (
          <CallCard
            key={call.id}
            call={call}
            onAssign={handleAssign}
            showDealSelector
          />
        ))}
      </div>
    );
  };

  const modalTitle = (
    <ModalTitleContent>
      <PhoneOutlined style={{ color: theme.colors.primary }} />
      <span>Неразобранные звонки контакта</span>
      {calls && calls.length > 0 && (
        <Badge
          count={calls.length}
          style={{
            backgroundColor: theme.colors.primary,
          }}
        />
      )}
    </ModalTitleContent>
  );

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={700}
      centered
      destroyOnHidden
    >
      <ModalContent>
        {renderContent()}
      </ModalContent>
    </Modal>
  );
};

export default CallsModal;
