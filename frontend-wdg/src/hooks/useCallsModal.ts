import { useState } from 'react';
import { logger } from '@utils/logger';

export const useCallsModal = () => {
  const [visible, setVisible] = useState(false);

  const openModal = () => {
    logger.info('Открытие модального окна звонков', { component: 'useCallsModal' });
    setVisible(true);
  };

  const closeModal = () => {
    logger.debug('Закрытие модального окна звонков', { component: 'useCallsModal' });
    setVisible(false);
  };

  return {
    visible,
    openModal,
    closeModal,
  };
};
