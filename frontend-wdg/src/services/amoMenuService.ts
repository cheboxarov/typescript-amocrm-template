import { logger } from '@utils/logger';
import { debounce } from '@utils/debounce';

/**
 * Сервис для работы с меню AmoCRM и добавления кнопки управления видимостью звонков
 */
class AmoMenuService {
  private toggleButton: HTMLElement | null = null;
  private menuObserver: MutationObserver | null = null;
  private isInitialized = false;

  /**
   * Инициализировать сервис и добавить кнопку в меню
   */
  initialize(onToggle: (showHidden: boolean) => void, getCurrentShowState: () => boolean) {
    if (this.isInitialized) {
      logger.debug('AmoMenuService уже инициализирован', { component: 'AmoMenuService' });
      return;
    }

    logger.info('Инициализация AmoMenuService', { component: 'AmoMenuService' });

    try {
      this.injectToggleButton(onToggle, getCurrentShowState);
      this.setupMenuObserver(onToggle, getCurrentShowState);
      this.isInitialized = true;

      logger.info('AmoMenuService успешно инициализирован', { component: 'AmoMenuService' });
    } catch (error) {
      logger.error('Ошибка инициализации AmoMenuService', {
        component: 'AmoMenuService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Уничтожить сервис и удалить кнопку
   */
  destroy() {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Уничтожение AmoMenuService', { component: 'AmoMenuService' });

    try {
      this.removeToggleButton();
      this.disconnectMenuObserver();
      this.isInitialized = false;

      logger.info('AmoMenuService успешно уничтожен', { component: 'AmoMenuService' });
    } catch (error) {
      logger.error('Ошибка уничтожения AmoMenuService', {
        component: 'AmoMenuService',
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Добавить кнопку переключения видимости звонков в меню
   */
  private injectToggleButton(onToggle: (showHidden: boolean) => void, getCurrentShowState: () => boolean) {
    const menuContainer = this.findMenuContainer();

    if (!menuContainer) {
      logger.warn('Контейнер меню не найден, кнопка не добавлена', {
        component: 'AmoMenuService'
      });
      return;
    }

    // Проверить, не существует ли уже кнопка
    const existingButton = menuContainer.querySelector('#toggle-hidden-calls') as HTMLElement;
    if (existingButton) {
      logger.debug('Кнопка уже существует, обновляем обработчик', {
        component: 'AmoMenuService'
      });
      this.updateButtonHandler(existingButton, onToggle, getCurrentShowState);
      return;
    }

    // Создать кнопку
    const buttonElement = this.createToggleButton(getCurrentShowState());
    menuContainer.appendChild(buttonElement);

    this.toggleButton = buttonElement;
    this.attachButtonHandler(buttonElement, onToggle, getCurrentShowState);

    logger.info('Кнопка переключения видимости добавлена в меню', {
      component: 'AmoMenuService',
      buttonId: buttonElement.id
    });
  }

  /**
   * Найти контейнер меню
   */
  private findMenuContainer(): HTMLElement | null {
    // Селектор согласно плану: .card-fields__top-name-more .button-input__context-menu
    const selector = '.card-fields__top-name-more .button-input__context-menu';
    return document.querySelector(selector) as HTMLElement;
  }

  /**
   * Создать элемент кнопки
   */
  private createToggleButton(showHiddenCalls: boolean): HTMLElement {
    const button = document.createElement('li');
    button.className = 'button-input__context-menu__item';
    button.id = 'toggle-hidden-calls';

    button.innerHTML = `
      <div class="button-input__context-menu__item__inner">
        <span class="button-input__context-menu__item__icon-container">
          <svg class="button-input__context-menu__item__icon svg-icon">
            <use xlink:href="#common--eye"></use>
          </svg>
        </span>
        <span class="button-input__context-menu__item__text">
          ${this.getButtonText(showHiddenCalls)}
        </span>
      </div>
    `;

    return button;
  }

  /**
   * Получить текст кнопки в зависимости от состояния
   */
  private getButtonText(showHiddenCalls: boolean): string {
    return showHiddenCalls ? 'Скрыть звонки' : 'Показать скрытые звонки';
  }

  /**
   * Обновить текст кнопки
   */
  updateButtonText(showHiddenCalls: boolean) {
    if (!this.toggleButton) {
      return;
    }

    const textElement = this.toggleButton.querySelector('.button-input__context-menu__item__text') as HTMLElement;
    if (textElement) {
      textElement.textContent = this.getButtonText(showHiddenCalls);

      logger.debug('Текст кнопки обновлен', {
        component: 'AmoMenuService',
        showHiddenCalls,
        newText: this.getButtonText(showHiddenCalls)
      });
    }
  }

  /**
   * Прикрепить обработчик клика к кнопке
   */
  private attachButtonHandler(
    button: HTMLElement,
    onToggle: (showHidden: boolean) => void,
    getCurrentShowState: () => boolean
  ) {
    const debouncedHandler = debounce(() => {
      const currentState = getCurrentShowState();
      const newState = !currentState;

      logger.info('Клик по кнопке переключения видимости', {
        component: 'AmoMenuService',
        currentState,
        newState
      });

      onToggle(newState);
      this.updateButtonText(newState);
    }, 300);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      debouncedHandler();
    });
  }

  /**
   * Обновить обработчик существующей кнопки
   */
  private updateButtonHandler(
    button: HTMLElement,
    onToggle: (showHidden: boolean) => void,
    getCurrentShowState: () => boolean
  ) {
    // Удалить старые обработчики (если есть)
    const newButton = button.cloneNode(true) as HTMLElement;
    button.parentNode?.replaceChild(newButton, button);

    this.attachButtonHandler(newButton, onToggle, getCurrentShowState);
    this.toggleButton = newButton;
  }

  /**
   * Удалить кнопку из меню
   */
  private removeToggleButton() {
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
      this.toggleButton = null;

      logger.debug('Кнопка переключения видимости удалена из меню', {
        component: 'AmoMenuService'
      });
    }
  }

  /**
   * Настроить наблюдатель за изменениями меню
   */
  private setupMenuObserver(onToggle: (showHidden: boolean) => void, getCurrentShowState: () => boolean) {
    this.menuObserver = new MutationObserver((mutations) => {
      let shouldReinject = false;

      mutations.forEach((mutation) => {
        // Проверить, было ли меню добавлено или изменено
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          // Если меню было добавлено или удалено
          const menuAdded = addedNodes.some(node =>
            node instanceof Element &&
            node.matches('.card-fields__top-name-more .button-input__context-menu')
          );

          const menuRemoved = removedNodes.some(node =>
            node instanceof Element &&
            node.matches('.card-fields__top-name-more .button-input__context-menu')
          );

          if (menuAdded || menuRemoved) {
            shouldReinject = true;
          }

          // Если наша кнопка была удалена
          const ourButtonRemoved = removedNodes.some(node =>
            node instanceof Element &&
            node.id === 'toggle-hidden-calls'
          );

          if (ourButtonRemoved) {
            shouldReinject = true;
          }
        }
      });

      if (shouldReinject) {
        logger.debug('Необходима повторная инъекция кнопки', {
          component: 'AmoMenuService'
        });
        setTimeout(() => {
          this.injectToggleButton(onToggle, getCurrentShowState);
        }, 100);
      }
    });

    // Начать наблюдение за изменениями в DOM
    this.menuObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    logger.debug('MutationObserver для меню запущен', {
      component: 'AmoMenuService'
    });
  }

  /**
   * Отключить наблюдатель за меню
   */
  private disconnectMenuObserver() {
    if (this.menuObserver) {
      this.menuObserver.disconnect();
      this.menuObserver = null;

      logger.debug('MutationObserver для меню отключен', {
        component: 'AmoMenuService'
      });
    }
  }
}

export const amoMenuService = new AmoMenuService();


