import React from 'react';
import { ThemeProvider } from 'styled-components';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { GlobalStyles } from '@styles/global';
import { theme } from '@styles/theme';
import '@styles/widgetContainer.css';
import ErrorBoundary from '@components/ErrorBoundary';
import WidgetContainer from '@components/WidgetContainer';
import { logger } from '@utils/logger';
import ReactDOM from 'react-dom/client';
import { initializeGlobalStore } from '@stores/callsStore';

const App: React.FC = () => {
  logger.debug('Рендеринг компонента App', {
    component: 'App.tsx',
    theme: { colors: Object.keys(theme.colors), spacing: Object.keys(theme.spacing) },
    antdLocale: 'ru_RU'
  });

  React.useEffect(() => {
    // Инициализируем глобальный store при запуске приложения
    initializeGlobalStore();

    logger.info('Виджет инициализирован с исправлениями', {
      component: 'App.tsx',
      fixes: {
        useAmoCRMContext: 'умный polling',
        useAttachNextStatus: 'исправлены зависимости useEffect',
        useUnassignedCalls: 'добавлен useRef для стабильных ссылок',
        callsStore: 'добавлен debounce для предотвращения множественных обновлений',
        globalStore: 'инициализирован глобальный store для отдельных рендерингов'
      },
      hasTheme: !!theme,
      hasGlobalStyles: !!GlobalStyles,
      hasErrorBoundary: !!ErrorBoundary,
      hasWidgetContainer: !!WidgetContainer
    });

    return () => {
      logger.debug('Компонент App размонтируется', { component: 'App.tsx' });
    };
  }, []);

  try {
  return (
    <ThemeProvider theme={theme}>
      <ConfigProvider locale={ruRU}>
        <GlobalStyles />
        <ErrorBoundary>
          <WidgetContainer />
        </ErrorBoundary>
      </ConfigProvider>
    </ThemeProvider>
  );
  } catch (error) {
    logger.critical('Ошибка рендеринга компонента App', {
      component: 'App.tsx',
      error: error instanceof Error ? error.message : String(error)
    }, error instanceof Error ? error : new Error(String(error)));

    // Fallback рендеринг в случае ошибки
    return (
      <div style={{
        padding: '20px',
        background: '#fff2f0',
        border: '1px solid #ffccc7',
        borderRadius: '4px',
        color: '#cf1322'
      }}>
        Ошибка инициализации приложения. Проверьте консоль для деталей.
      </div>
    );
  }
};

// Создаем объект виджета с компонентом и методами API для amoCRM
const AppWidget = {
  // React компонент
  Component: App,

  // Метод render для amoCRM Widget API
  render: (self?: any) => {
    logger.info('App.render вызван amoCRM Widget API', {
      component: 'App',
      hasSelf: !!self,
      selfType: typeof self
    });

    try {
      // Создаем контейнер для виджета если его нет
      let container = document.getElementById('calls-manager-widget-root');

      if (!container) {
        logger.debug('Создание контейнера виджета', { component: 'App.render' });
        container = document.createElement('div');
        container.id = 'calls-manager-widget-root';
        container.setAttribute('data-widget-version', '1.0.0');
        document.body.appendChild(container);
      }

      // Инициализируем React root
      logger.debug('Инициализация React root', { 
        component: 'App.render',
        containerId: container!.id,
        containerType: container!.tagName,
      });

      logger.info('Создание React корня для App компонента', {
        component: 'App.render',
        containerId: container!.id,
        containerType: container!.tagName,
        timestamp: Date.now(),
        reactVersion: React.version,
        reactDOMVersion: ReactDOM.version || 'unknown',
      });

      const root = ReactDOM.createRoot(container!);
      
      logger.info('React корень для App компонента создан', {
        component: 'App.render',
        containerId: container!.id,
        rootType: typeof root,
        timestamp: Date.now(),
      });

      // Рендерим приложение
      root.render(
        React.createElement(App)
      );

      logger.info('Виджет успешно отрендерен', {
        component: 'App.render',
        containerId: container!.id,
        hasRoot: !!root
      });

    } catch (error) {
      logger.critical('Критическая ошибка рендеринга виджета', {
        component: 'App.render',
        error: error instanceof Error ? error.message : String(error)
      }, error);
    }
  },

  // Метод onSave для amoCRM Widget API
  onSave: (self?: any) => {
    logger.info('AppWidget onSave called', {
      component: 'AppWidget',
      hasSelf: !!self,
      selfType: typeof self
    });
    return true;
  },

  // Метод init для amoCRM Widget API
  init: (self?: any) => {
    logger.info('AppWidget init called', {
      component: 'AppWidget',
      hasSelf: !!self,
      selfType: typeof self
    });
    return true;
  },

  // Метод bind_actions для amoCRM Widget API
  bind_actions: (self?: any) => {
    logger.info('AppWidget bind_actions called', {
      component: 'AppWidget',
      hasSelf: !!self,
      selfType: typeof self
    });
    return true;
  },

  // Метод settings для amoCRM Widget API
  settings: (self?: any) => {
    logger.info('AppWidget settings called', {
      component: 'AppWidget',
      hasSelf: !!self,
      selfType: typeof self
    });
    return {};
  },

  // Метод destroy для amoCRM Widget API
  destroy: (self?: any) => {
    logger.info('AppWidget destroy called', {
      component: 'AppWidget',
      hasSelf: !!self,
      selfType: typeof self
    });

    try {
      // Очистка контейнера виджета
      const container = document.getElementById('calls-manager-widget-root');
      if (container) {
        container.remove();
        logger.debug('Контейнер виджета удален', {
          component: 'AppWidget',
          containerId: 'calls-manager-widget-root'
        });
      }

      return true;
    } catch (error) {
      logger.error('Ошибка при уничтожении виджета', {
        component: 'AppWidget',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
};

// Добавляем объект callbacks для совместимости с AmoCRM
(AppWidget as any).callbacks = {
  render: AppWidget.render,
  onSave: AppWidget.onSave,
  init: AppWidget.init,
  bind_actions: AppWidget.bind_actions,
  settings: AppWidget.settings,
  destroy: AppWidget.destroy
};

export default AppWidget;
