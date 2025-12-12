import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWidget from './App';
import { ContactWidget } from '@components/ContactWidget';
import { DealCallsManager } from '@components/DealCallsManager';
import { amocrmService } from '@services/amocrmService';
import { logger } from '@utils/logger';
import { cleanupGlobalStore, initializeGlobalStore } from '@stores/callsStore';

console.log('[MAIN] Initializing main.jsx');

// Инициализируем глобальный store на старте приложения
logger.info('Инициализация глобального store перед рендерингом виджетов', {
	component: 'Widget',
	timestamp: Date.now()
});

const initializedStore = initializeGlobalStore();

if (initializedStore) {
	logger.info('Глобальный store успешно инициализирован на уровне приложения', {
		component: 'Widget',
		timestamp: Date.now(),
		hasStore: !!initializedStore
	});
} else {
	logger.warn('Не удалось инициализировать store на уровне приложения', {
		component: 'Widget',
		timestamp: Date.now()
	});
}

const Widget = {
	render(self: any) {
		logger.info('Widget render called', { component: 'Widget' });

		try {
			// Определяем тип текущей карточки
			const currentEntity = amocrmService.getCurrentEntity();
			const currentCard = amocrmService.getCurrentCard();

			logger.debug('Определен контекст карточки', {
				component: 'Widget',
				currentEntity,
				currentCard: currentCard ? { id: currentCard.id, type: currentCard.element_type } : null
			});

			if (currentEntity === 'leads' && currentCard) {
				// Карточка сделки - создаем виджеты для каждого контакта
				return Widget.renderLeadWidgets(self, currentCard.id);
			} else if (currentEntity === 'contacts' && currentCard) {
				// Карточка контакта - создаем один виджет
				return Widget.renderContactWidget(self);
			} else {
				logger.warn('Не удалось определить контекст карточки, используем fallback', {
					component: 'Widget',
					currentEntity,
					hasCurrentCard: !!currentCard
				});
				return Widget.renderFallbackWidget(self);
			}
		} catch (error) {
			logger.critical('Error rendering widget', {
				component: 'Widget',
				error: error instanceof Error ? error.message : String(error)
			}, error instanceof Error ? error : undefined);
			return false;
		}
	},

	init(self: any) {
		logger.info('Widget init called', { component: 'Widget' });
		return true;
	},

	bind_actions(self: any) {
		logger.info('Widget bind_actions called', { component: 'Widget' });
		return true;
	},

	settings(self: any) {
		logger.info('Widget settings called', { component: 'Widget' });
		return {};
	},

	onSave(self: any) {
		logger.info('Widget onSave called', { component: 'Widget' });
		return true;
	},

	destroy(self: any) {
		logger.info('Widget destroy called', { component: 'Widget' });

		try {
			// Очистка основного контейнера виджета (для карточки контакта)
			const mainContainer = document.getElementById('calls-manager-widget-root');
			if (mainContainer) {
				mainContainer.remove();
				logger.debug('Основной контейнер виджета удален', {
					component: 'Widget',
					containerId: 'calls-manager-widget-root'
				});
			}

			// Очистка всех виджетов контактов (для карточки сделки)
			const contactWidgets = document.querySelectorAll('.contact-widget-container');
			contactWidgets.forEach(container => {
				container.remove();
				logger.debug('Виджет контакта удален', {
					component: 'Widget',
					containerId: container.id,
					contactId: container.getAttribute('data-contact-id')
				});
			});

			// Очистка fallback контейнера (если есть)
			const fallbackContainers = document.querySelectorAll('.calls-manager-widget-fallback');
			fallbackContainers.forEach(container => {
				container.remove();
				logger.debug('Fallback контейнер виджета удален', {
					component: 'Widget',
					containerClass: 'calls-manager-widget-fallback'
				});
			});

			// Очистка глобального store
			cleanupGlobalStore();
			logger.debug('Глобальный store очищен', { component: 'Widget' });

			logger.info('Виджет успешно уничтожен', {
				component: 'Widget',
				mainContainersRemoved: mainContainer ? 1 : 0,
				contactWidgetsRemoved: contactWidgets.length,
				fallbackContainersRemoved: fallbackContainers.length
			});
			return true;
		} catch (error) {
			logger.error('Ошибка при уничтожении виджета', {
				component: 'Widget',
				error: error instanceof Error ? error.message : String(error)
			}, error instanceof Error ? error : undefined);
			return false;
		}
	},

	/**
	 * Рендеринг виджетов для карточки сделки (по одному для каждого контакта)
	 */
	renderLeadWidgets(self: any, dealId: number): boolean {
		try {
			logger.info('Начинаем рендеринг виджетов для карточки сделки', {
				component: 'Widget',
				dealId,
				method: 'renderLeadWidgets'
			});

			// Получить все контакты из карточки сделки
			const contacts = amocrmService.getAllContactsFromDeal();

			if (contacts.length === 0) {
				logger.warn('Не найдено контактов в карточке сделки', {
					component: 'Widget',
					dealId
				});
				return Widget.renderFallbackWidget(self);
			}

			logger.info('Найдены контакты для создания виджетов', {
				component: 'Widget',
				dealId,
				contactsCount: contacts.length,
				contacts: contacts.map(c => ({ id: c.contactId, name: c.contactName }))
			});

			// Создать виджет для каждого контакта
			contacts.forEach((contact, index) => {
				try {
					// Валидация данных контакта перед рендерингом
					if (!contact.contactId || !contact.containerElement) {
						logger.warn('Пропускаем контакт с некорректными данными', {
							component: 'Widget',
							dealId,
							contactIndex: index,
							contactId: contact.contactId,
							hasContainerElement: !!contact.containerElement
						});
						return;
					}

					Widget.renderContactWidgetForLead(self, contact, dealId, index);
				} catch (error) {
					logger.error('Ошибка создания виджета для контакта', {
						component: 'Widget',
						dealId,
						contactId: contact.contactId,
						contactName: contact.contactName,
						error: error instanceof Error ? error.message : String(error)
					}, error instanceof Error ? error : new Error(String(error)));
				}
			});

			// Создаем компонент для управления видимостью звонков
			try {
				const container = document.createElement('div');
				container.id = `deal-calls-manager-${dealId}`;
				container.style.display = 'none'; // Скрытый контейнер

				document.body.appendChild(container);

				logger.info('Создание React корня для DealCallsManager', {
					component: 'Widget',
					dealId,
					containerId: container.id,
					containerType: container.tagName,
					timestamp: Date.now(),
					reactVersion: React.version,
					reactDOMVersion: ReactDOM.version || 'unknown',
				});

				const root = ReactDOM.createRoot(container);
				
				logger.info('React корень для DealCallsManager создан', {
					component: 'Widget',
					dealId,
					containerId: container.id,
					rootType: typeof root,
					timestamp: Date.now(),
				});

				root.render(
					React.createElement(DealCallsManager, { dealId: dealId.toString() })
				);

				logger.debug('DealCallsManager успешно создан', {
					component: 'Widget',
					dealId,
					containerId: container.id
				});
			} catch (error) {
				logger.error('Ошибка создания DealCallsManager', {
					component: 'Widget',
					dealId,
					error: error instanceof Error ? error.message : String(error)
				}, error instanceof Error ? error : new Error(String(error)));
			}

			logger.info('Виджеты для карточки сделки успешно созданы', {
				component: 'Widget',
				dealId,
				widgetsCreated: contacts.length
			});

			return true;
		} catch (error) {
			logger.error('Ошибка рендеринга виджетов для карточки сделки', {
				component: 'Widget',
				dealId,
				error: error instanceof Error ? error.message : String(error)
			}, error instanceof Error ? error : new Error(String(error)));
			return false;
		}
	},

	/**
	 * Рендеринг виджета для одного контакта в карточке сделки
	 */
	renderContactWidgetForLead(self: any, contact: any, dealId: number, index: number): boolean {
		try {
			logger.debug('Создание виджета для контакта в сделке', {
				component: 'Widget',
				contactId: contact.contactId,
				contactName: contact.contactName,
				dealId,
				index,
				containerElementType: contact.containerElement?.tagName,
				containerElementClass: contact.containerElement?.className
			});

			// Проверка что containerElement является HTMLElement
			if (!(contact.containerElement instanceof HTMLElement)) {
				logger.error('containerElement не является HTMLElement', {
					component: 'Widget',
					contactId: contact.contactId,
					containerElementType: typeof contact.containerElement
				});
				return false;
			}

			// Создать контейнер виджета для этого контакта
			const widgetContainer = document.createElement('div');
			widgetContainer.className = 'contact-widget-container';
			widgetContainer.id = `contact-widget-${contact.contactId}`;
			widgetContainer.setAttribute('data-contact-id', contact.contactId);
			widgetContainer.setAttribute('data-deal-id', String(dealId));
			widgetContainer.setAttribute('data-widget-version', '1.0.0');

			// Добавить виджет рядом с элементом контакта
			contact.containerElement.appendChild(widgetContainer);

			// Рендерить ContactWidget компонент
			const React = require('react');
			const ReactDOM = require('react-dom/client');

			logger.info('Создание React корня для ContactWidget', {
				component: 'Widget',
				contactId: contact.contactId,
				contactName: contact.contactName,
				dealId,
				containerId: widgetContainer.id,
				containerType: widgetContainer.tagName,
				timestamp: Date.now(),
				reactVersion: React.version,
				reactDOMVersion: ReactDOM.version || 'unknown',
			});

			const root = ReactDOM.createRoot(widgetContainer);
			
			logger.info('React корень для ContactWidget создан', {
				component: 'Widget',
				contactId: contact.contactId,
				dealId,
				containerId: widgetContainer.id,
				rootType: typeof root,
				timestamp: Date.now(),
			});

			root.render(
				React.createElement(ContactWidget, {
					contactId: contact.contactId,
					contactName: contact.contactName,
					dealId: String(dealId)
				})
			);

			logger.debug('Виджет для контакта успешно создан', {
				component: 'Widget',
				contactId: contact.contactId,
				containerId: widgetContainer.id
			});

			return true;
		} catch (error) {
			logger.error('Ошибка создания виджета для контакта', {
				component: 'Widget',
				contactId: contact.contactId,
				dealId,
				error: error instanceof Error ? error.message : String(error)
			}, error instanceof Error ? error : new Error(String(error)));
			return false;
		}
	},

	/**
	 * Рендеринг виджета для карточки контакта (старый способ)
	 */
	renderContactWidget(self: any): boolean {
		try {
			logger.debug('Рендеринг виджета для карточки контакта', {
				component: 'Widget',
				method: 'renderContactWidget'
			});

			// Найти контейнер карточки контакта
			const contactContainer = document.querySelector(
				'.linked-forms__group-wrapper.linked-forms__group-wrapper_main.js-cf-group-wrapper[data-id="default"]'
			) as HTMLElement;

			let targetContainer: HTMLElement;

			if (contactContainer) {
				logger.debug('Найден контейнер карточки контакта', {
					component: 'Widget',
					containerClass: contactContainer.className
				});

				// Создать контейнер виджета
  const widgetContainer = document.createElement('div');
				widgetContainer.className = 'calls-manager-widget-container';
  widgetContainer.id = 'calls-manager-widget-root';
				widgetContainer.setAttribute('data-widget-version', '1.0.0');

				// Добавить в конец контейнера карточки
				contactContainer.appendChild(widgetContainer);
				targetContainer = widgetContainer;

				logger.info('Виджет внедрен в карточку контакта', {
					component: 'Widget',
					targetContainer: 'contact-card',
					containerId: widgetContainer.id
				});
			} else {
				logger.warn('Контейнер карточки контакта не найден, используем fallback', {
					component: 'Widget'
				});
				return Widget.renderFallbackWidget(self);
			}

			const React = require('react');
			const ReactDOM = require('react-dom/client');
			const AppWidget = require('./App').default;

			logger.info('Создание React корня для ContactWidget (App)', {
				component: 'Widget',
				containerId: targetContainer.id,
				containerType: targetContainer.tagName,
				timestamp: Date.now(),
				reactVersion: React.version,
				reactDOMVersion: ReactDOM.version || 'unknown',
			});

			const root = ReactDOM.createRoot(targetContainer);
			
			logger.info('React корень для ContactWidget (App) создан', {
				component: 'Widget',
				containerId: targetContainer.id,
				rootType: typeof root,
				timestamp: Date.now(),
			});

			root.render(
				React.createElement(AppWidget.Component, { widget: self })
			);

			logger.info('Виджет для карточки контакта успешно создан', {
				component: 'Widget',
				containerId: targetContainer.id
			});

			return true;
		} catch (error) {
			logger.error('Ошибка рендеринга виджета для карточки контакта', {
				component: 'Widget',
				error: error instanceof Error ? error.message : String(error)
			}, error instanceof Error ? error : new Error(String(error)));
			return false;
		}
	},

	/**
	 * Рендеринг fallback виджета
	 */
	renderFallbackWidget(self: any): boolean {
		try {
			logger.debug('Рендеринг fallback виджета', {
				component: 'Widget',
				method: 'renderFallbackWidget'
			});

			// Fallback: добавить в body
			const fallbackContainer = document.createElement('div');
			fallbackContainer.className = 'calls-manager-widget-container calls-manager-widget-fallback';
			fallbackContainer.id = 'calls-manager-widget-root';
			fallbackContainer.setAttribute('data-widget-version', '1.0.0');

			document.body.appendChild(fallbackContainer);

			const React = require('react');
			const ReactDOM = require('react-dom/client');
			const AppWidget = require('./App').default;

			logger.info('Создание React корня для Fallback виджета', {
				component: 'Widget',
				containerId: fallbackContainer.id,
				containerType: fallbackContainer.tagName,
				timestamp: Date.now(),
				reactVersion: React.version,
				reactDOMVersion: ReactDOM.version || 'unknown',
			});

			const root = ReactDOM.createRoot(fallbackContainer);
			
			logger.info('React корень для Fallback виджета создан', {
				component: 'Widget',
				containerId: fallbackContainer.id,
				rootType: typeof root,
				timestamp: Date.now(),
			});

			root.render(
				React.createElement(AppWidget.Component, { widget: self })
			);

			logger.info('Fallback виджет успешно создан', {
				component: 'Widget',
				containerId: fallbackContainer.id
			});

			return true;
		} catch (error) {
			logger.error('Ошибка рендеринга fallback виджета', {
				component: 'Widget',
				error: error instanceof Error ? error.message : String(error)
			}, error instanceof Error ? error : new Error(String(error)));
			return false;
		}
	},
};

export default Widget;
