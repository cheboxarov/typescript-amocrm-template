import React from 'react';
import { Typography } from 'antd';
import styled from 'styled-components';
import AttachNextButton from '@components/AttachNextButton';
import { theme } from '@styles/theme';
import { logger } from '@utils/logger';
import { initializeGlobalStore } from '@stores/callsStore';

const { Title } = Typography;

interface ContactWidgetProps {
  contactId: string;
  contactName: string;
  dealId: string;
}

const ContactWidgetContainer = styled.div`
  margin: 8px 0 12px 0;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  position: relative;
  font-size: 13px;

  /* Анимация появления */
  animation: contactWidgetFadeIn 0.3s ease-out;

  @keyframes contactWidgetFadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Компактные стили для узких областей */
  @media (max-width: 1200px) {
    margin: 6px 0 8px 0;
    padding: 6px 8px;
    font-size: 12px;
  }

  /* Адаптивность для мобильных */
  @media (max-width: 768px) {
    margin: 4px 0 6px 0;
    padding: 4px 6px;
  }
`;

const ContactWidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid ${theme.colors.borderLight};
`;

const ContactName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.textSecondary};
  line-height: 1.2;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 1200px) {
    font-size: 11px;
    max-width: 180px;
  }

  @media (max-width: 768px) {
    font-size: 10px;
    max-width: 150px;
  }
`;

const ContactWidget: React.FC<ContactWidgetProps> = ({
  contactId,
  contactName,
  dealId
}) => {
  // Валидация пропсов
  if (!contactId || !dealId) {
    logger.error('ContactWidget получил некорректные пропсы', {
      component: 'ContactWidget',
      contactId,
      contactName,
      dealId
    });
    return null;
  }

  React.useEffect(() => {
    // Инициализируем глобальный store при монтировании компонента
    // Это гарантирует что store доступен даже при отдельном рендеринге
    initializeGlobalStore();

    logger.debug('ContactWidget смонтирован', {
      component: 'ContactWidget',
      contactId,
      contactName,
      dealId
    });

    return () => {
      logger.debug('ContactWidget размонтируется', {
        component: 'ContactWidget',
        contactId
      });
    };
  }, [contactId, contactName, dealId]);


  return (
    <ContactWidgetContainer data-contact-id={contactId}>
      <ContactWidgetHeader>
        <ContactName title={contactName}>
          {contactName}
        </ContactName>
      </ContactWidgetHeader>

      <AttachNextButton
        dealId={dealId}
        contactId={contactId}
      />
    </ContactWidgetContainer>
  );
};

export default ContactWidget;
