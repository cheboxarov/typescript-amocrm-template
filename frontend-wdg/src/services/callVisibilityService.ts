import { logger } from '@utils/logger';

interface HiddenCallMeta {
  callElement: HTMLElement;
  placeholder: HTMLElement;
  placeholderButton: HTMLButtonElement;
  hideButton: HTMLButtonElement;
  originalDisplay: string;
  isHidden: boolean;
}

/**
 * Сервис для управления видимостью звонков в DOM amoCRM
 */
class CallVisibilityService {
  private hiddenCalls = new Map<string, HiddenCallMeta>();

  private buildPlaceholder(callId: string) {
    const placeholder = document.createElement('div');
    placeholder.className = 'call-hidden-placeholder';
    placeholder.dataset.callId = callId;

    const text = document.createElement('span');
    text.textContent = 'Звонок по другой сделке';
    text.style.marginLeft = '32px';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'call-hidden-placeholder__button';
    button.textContent = 'Показать звонок';

    placeholder.append(text, button);
    return { placeholder, button };
  }

  private applyHiddenCallStyles(placeholder: HTMLElement, showButton: HTMLButtonElement, hideButton: HTMLButtonElement) {
    placeholder.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px 6px 24px;
      border-radius: 4px;
      background: #f5f5f5;
      color: #595959;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
      position: relative;
    `;

    showButton.style.cssText = `
      border: 1px solid #d9d9d9;
      background: rgba(255, 255, 255, 0.9);
      color: #8c8c8c;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 6px;
      margin-left: 16px;
      flex-shrink: 0;
      border-radius: 3px;
    `;

    hideButton.style.cssText = `
      border: none;
      background: transparent;
      color: #8c8c8c;
      font-size: 11px;
      cursor: pointer;
      padding: 2px 6px;
      position: absolute;
      top: -28px;
      right: 12px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 3px;
      border: 1px solid #d9d9d9;
    `;
  }

  private findCallElement(callId: string): HTMLElement | null {
    const callElement = document.querySelector(`[data-id="${callId}"]`);
    if (callElement && callElement instanceof HTMLElement) {
      return callElement;
    }
    return null;
  }

  private ensureMeta(callId: string): HiddenCallMeta | null {
    const existingMeta = this.hiddenCalls.get(callId);
    if (existingMeta) {
      return existingMeta;
    }

    const callElement = this.findCallElement(callId);
    if (!callElement) {
      logger.warn('Call element not found for decoration', {
        component: 'CallVisibilityService',
        callId
      });
      return null;
    }

    const { placeholder, button } = this.buildPlaceholder(callId);
    const parent = callElement.parentElement;
    if (!parent) {
      logger.warn('Call element has no parent, пропускаем украшение', {
        component: 'CallVisibilityService',
        callId
      });
      return null;
    }

    parent.insertBefore(placeholder, callElement);

    const hideButton = document.createElement('button');
    hideButton.type = 'button';
    hideButton.className = 'hidden-call-hide-btn';
    hideButton.textContent = 'Скрыть звонок';
    hideButton.style.display = 'none';
    callElement.insertAdjacentElement('afterbegin', hideButton);

    this.applyHiddenCallStyles(placeholder, button, hideButton);

    const meta: HiddenCallMeta = {
      callElement,
      placeholder,
      placeholderButton: button,
      hideButton,
      originalDisplay: callElement.style.display || '',
      isHidden: true
    };

    button.addEventListener('click', () => this.showCallContent(callId));
    hideButton.addEventListener('click', () => this.hideCallContent(callId));

    this.hiddenCalls.set(callId, meta);

    return meta;
  }

  private hideCallContent(callId: string) {
    const meta = this.ensureMeta(callId);
    if (!meta) return;

    meta.callElement.style.display = 'none';
    meta.placeholder.style.display = '';
    meta.hideButton.style.display = 'none';
    meta.isHidden = true;
  }

  private showCallContent(callId: string, cleanup: boolean = false) {
    const meta = this.hiddenCalls.get(callId);
    if (!meta) {
      return;
    }

    meta.callElement.style.display = meta.originalDisplay || '';
    meta.placeholder.style.display = 'none';
    meta.hideButton.style.display = '';
    meta.isHidden = false;

    if (cleanup) {
      this.cleanupMeta(callId);
    }
  }

  private cleanupMeta(callId: string) {
    const meta = this.hiddenCalls.get(callId);
    if (!meta) return;
    meta.placeholder.remove();
    meta.hideButton.remove();
    this.hiddenCalls.delete(callId);
  }

  /**
   * Скрыть звонки в DOM (оборачиваем в placeholder)
   */
  hideCalls(callIds: Set<string>) {
    logger.debug('Украшаем звонки в DOM', {
      component: 'CallVisibilityService',
      callIdsCount: callIds.size,
      callIds: Array.from(callIds)
    });

    callIds.forEach(callId => {
      try {
        this.hideCallContent(callId);
      } catch (error) {
        logger.error('Ошибка при украшении звонка', {
          component: 'CallVisibilityService',
          action: 'decorate_error',
          callId,
          error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
      }
    });
  }

  /**
   * Показать звонки в DOM (убрать placeholder)
   */
  showCalls(callIds: Set<string>) {
    logger.debug('Показываем звонки в DOM', {
      component: 'CallVisibilityService',
      callIdsCount: callIds.size,
      callIds: Array.from(callIds)
    });

    callIds.forEach(callId => {
      try {
        this.showCallContent(callId);
      } catch (error) {
        logger.error('Ошибка при показе звонка', {
          component: 'CallVisibilityService',
          action: 'show_error',
          callId,
          error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
      }
    });
  }

  /**
   * Показать все звонки (очистить декор)
   */
  showAllCalls() {
    logger.debug('Начинаем показ всех скрытых звонков', {
      component: 'CallVisibilityService',
      hiddenCount: this.hiddenCalls.size
    });

    const callIds = Array.from(this.hiddenCalls.keys());
    callIds.forEach(callId => {
      this.showCallContent(callId, true);
    });

    logger.info('Завершено показ всех скрытых звонков', {
      component: 'CallVisibilityService',
      shown: callIds.length
    });
  }

  /**
   * Получить список скрытых звонков
   */
  getHiddenCalls(): Set<string> {
    return new Set(this.hiddenCalls.keys());
  }

  /**
   * Проверить, скрыт ли звонок
   */
  isCallHidden(callId: string): boolean {
    const meta = this.hiddenCalls.get(callId);
    return !!meta && meta.isHidden;
  }

  /**
   * Переключить видимость скрытых звонков
   * @param showHiddenCalls - если true, показать все скрытые звонки, если false - скрыть их снова
   */
  toggleHiddenCallsVisibility(showHiddenCalls: boolean) {
    logger.debug('Переключение видимости скрытых звонков', {
      component: 'CallVisibilityService',
      showHiddenCalls,
      hiddenCallsCount: this.hiddenCalls.size
    });

    if (showHiddenCalls) {
      this.showAllCalls();
    } else {
      this.hideCalls(new Set(this.hiddenCalls.keys()));
    }
  }
}

export const callVisibilityService = new CallVisibilityService();
