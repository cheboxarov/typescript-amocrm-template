import React, { useEffect } from 'react';
import { Typography, Alert, Button } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useAmoCRMContext } from '@hooks/useAmoCRMContext';
import { useCallsModal } from '@hooks/useCallsModal';
import { useCallVisibilityFilter } from '@hooks/useCallVisibilityFilter';
import { domParserService } from '@services/domParser';
import { theme } from '@styles/theme';
import UnassignedCallsBlock from '@components/UnassignedCallsBlock';
import AttachNextButton from '@components/AttachNextButton';
import CallsModal from '@components/CallsModal';
import Loader from '@components/Loader';
import { logger } from '@utils/logger';

const { Title, Text } = Typography;

const Container = styled.div`
  width: 100%;
`;

const WidgetHeader = styled.div`
  margin-bottom: 4px;
`;

const WidgetTitle = styled(Title)`
  && {
    margin-bottom: 0;
    color: ${theme.colors.primary};
    font-size: 14px !important;
  }
`;

const WidgetDescription = styled(Text)`
  display: block;
  color: ${theme.colors.textSecondary};
  font-size: 12px;
  line-height: 1.3;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const WidgetContainer: React.FC = () => {
  const context = useAmoCRMContext();
  const { entityType, entityId, contactId, isContact, isLead, isLoading } = context;
  const { visible: callsModalVisible, openModal: openCallsModal, closeModal: closeCallsModal } = useCallsModal();
  const { checkAndHideCalls, showAllCalls } = useCallVisibilityFilter(isLead ? String(entityId) : null);

  logger.debug('Рендеринг WidgetContainer', {
    component: 'WidgetContainer',
    context: {
      entityType,
      entityId,
      contactId: contactId ? 'получен' : null,
      isContact,
      isLead,
      isLoading
    }
  });

  React.useEffect(() => {
    logger.info('Компонент WidgetContainer смонтирован', {
      component: 'WidgetContainer',
      context
    });

    return () => {
      logger.debug('Компонент WidgetContainer размонтируется', {
        component: 'WidgetContainer'
      });
    };
  }, []);

  // Наблюдение за изменениями в ленте активности для карточки сделки
  useEffect(() => {
    let feedObserver: MutationObserver | null = null;

    // Всегда запускаем начальную проверку (checkAndHideCalls сам проверит dealId)
      checkAndHideCalls();

    // Всегда наблюдаем за изменениями в ленте активности
      feedObserver = domParserService.observeFeedNotes((mutations) => {
        logger.debug('Обнаружены изменения в ленте активности', {
          component: 'WidgetContainer',
          mutationsCount: mutations.length,
          dealId: entityId
        });

        // Даем время на завершение DOM обновлений
        setTimeout(() => {
          checkAndHideCalls();
        }, 100);
      });

    return () => {
      if (feedObserver) {
        logger.debug('Отключаем наблюдатель за лентой активности', {
          component: 'WidgetContainer'
        });
        feedObserver.disconnect();
      }

      // Показываем все звонки при уходе с карточки сделки
      if (isLead) {
        showAllCalls();
      }
    };
  }, [isLead, entityId, checkAndHideCalls, showAllCalls]);

  // Логика определения состояния виджета
  const widgetState = React.useMemo(() => {
  if (isLoading) {
      logger.debug('Виджет в состоянии загрузки', { component: 'WidgetContainer' });
      return 'loading';
    }

    if (!entityType || !entityId) {
      logger.warn('Виджет не может определить контекст amoCRM', {
        component: 'WidgetContainer',
        entityType,
        entityId,
        hasEntityType: !!entityType,
        hasEntityId: !!entityId
      });
      return 'inactive';
    }

    if (isContact && contactId) {
      logger.info('Виджет активен для карточки контакта', {
        component: 'WidgetContainer',
        contactId,
        entityId
      });
      return 'contact';
    }

    if (isLead && entityId) {
      logger.info('Виджет активен для карточки сделки', {
        component: 'WidgetContainer',
        entityId,
        entityType
      });
      return 'lead';
    }

    logger.debug('Виджет неактивен - неподдерживаемый тип карточки', {
      component: 'WidgetContainer',
      entityType,
      isContact,
      isLead
    });
    return 'inactive';

  }, [entityType, entityId, contactId, isContact, isLead, isLoading]);

  // Рендеринг в зависимости от состояния
  switch (widgetState) {
    case 'loading':
    return (
      <Container>
        <Loader fullHeight tip="Загрузка виджета..." />
      </Container>
    );


    case 'contact':
      logger.debug('Рендеринг для карточки контакта', {
        component: 'WidgetContainer',
        contactId,
        entityId
      });
    return (
      <Container>
        <ContentWrapper>
            <Button
              type="primary"
              icon={<PhoneOutlined />}
              block
              onClick={openCallsModal}
              style={{ marginTop: '8px' }}
            >
              Неразобранные звонки
            </Button>
        </ContentWrapper>

          <CallsModal
            visible={callsModalVisible}
            onClose={closeCallsModal}
          />
      </Container>
    );

    case 'lead':
      // Виджеты для контактов теперь создаются отдельно в index.tsx
      logger.debug('Карточка сделки - виджеты контактов создаются отдельно', {
        component: 'WidgetContainer',
        entityId,
        entityType
      });
      return null;

    case 'inactive':
    default:
      logger.debug('Виджет неактивен, возвращаем null', {
        component: 'WidgetContainer',
        widgetState
      });
      return null;
  }
};

export default WidgetContainer;
