import { apiClient } from './apiClient';
import { logger } from '@utils/logger';
import {
  UnassignedCallsResponse,
  Call,
  AssignCallRequest,
  AttachNextRequest,
  AttachNextResponse,
  AttachNextStatusResponse,
  CancelAttachNextRequest,
  CancelAttachNextResponse,
} from '../types/models';

/**
 * API сервис для работы со звонками
 */
class CallsAPI {
  /**
   * Получение неразобранных звонков контакта
   */
  async getUnassignedCalls(
    contactId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<UnassignedCallsResponse> {
    return apiClient.get<UnassignedCallsResponse>(
      `/api/v1/contacts/${contactId}/unassigned-calls?page=${page}&limit=${limit}`
    );
  }

  /**
   * Привязка звонка к сделке
   */
  async assignCallToDeal(callId: string, dealId: string): Promise<Call> {
    const body: AssignCallRequest = { deal_id: dealId };
    return apiClient.post<Call>(`/api/v1/calls/${callId}/assign`, body);
  }

  /**
   * Отвязка звонка от сделки
   */
  async unassignCall(callId: string): Promise<Call> {
    const body: AssignCallRequest = { deal_id: null };
    return apiClient.post<Call>(`/api/v1/calls/${callId}/assign`, body);
  }

  /**
   * Привязка звонка к сделке по хешу ссылки
   */
  async assignCallByHash(
    hash: string,
    contactId: string,
    dealId: string,
    callData: {
      noteType?: 'incoming' | 'outgoing';
      phone?: string;
      durationSeconds?: number;
      link?: string;
      source?: string;
      reason?: string;
    }
  ): Promise<Call> {
    const body = {
      amo_id: hash,
      contact_id: parseInt(contactId),
      deal_id: parseInt(dealId),
      note_type: callData.noteType === 'outgoing' ? 'call_out' : 'call_in',
      phone: callData.phone || null,
      duration_seconds: callData.durationSeconds || null,
      link: callData.link || null,
      source: callData.source || null,
      reason: callData.reason || null,
    };
    return apiClient.post<Call>('/api/v1/calls/assign-by-hash', body);
  }

  /**
   * Активация режима автопривязки
   */
  async activateAttachNext(
    contactId: string,
    dealId: string,
    ttlSeconds: number = 600
  ): Promise<AttachNextResponse> {
    const body: AttachNextRequest = {
      contact_id: contactId,
      deal_id: dealId,
      ttl_seconds: ttlSeconds,
    };

    const response = await apiClient.post<any>('/api/v1/calls/attach-next', body);

    // Конвертируем snake_case в camelCase
    return {
      status: response.status,
      expiresAt: response.expires_at, // Уже в миллисекундах
      ttlSeconds: response.ttl_seconds
    };
  }

  /**
   * Отмена режима автопривязки
   */
  async cancelAttachNext(contactId: string): Promise<CancelAttachNextResponse> {
    return apiClient.delete<CancelAttachNextResponse>(
      `/api/v1/calls/attach-next?contact_id=${contactId}`
    );
  }

  /**
   * Проверка статуса автопривязки
   */
  async getAttachNextStatus(contactId: string): Promise<AttachNextStatusResponse> {
    const response = await apiClient.get<any>(
      `/api/v1/contacts/${contactId}/next-call-deal`
    );

    // Конвертируем snake_case в camelCase и преобразуем данные
    let expiresAt: number | null = null;
    if (response.expires_at) {
      // expires_at приходит в миллисекундах как число
      if (typeof response.expires_at === 'number') {
        expiresAt = response.expires_at;
      } else {
        // Если expires_at строка (ISO формат)
        expiresAt = new Date(response.expires_at).getTime();
      }
    }

    return {
      isActive: response.is_active,
      dealId: String(response.deal_id), // Конвертируем в строку для корректного сравнения
      expiresAt,
      ttlSeconds: response.ttl_seconds
    };
  }

  /**
   * Получить принадлежность звонков к сделкам (батч)
   */
  async getCallsDealAssignment(amoCallIds: string[]): Promise<Record<string, any>> {
    logger.info('Отправка батч-запроса о принадлежности звонков к сделкам', {
      component: 'CallsAPI',
      action: 'batch_deal_assignment_start',
      callIdsCount: amoCallIds.length,
      callIds: amoCallIds
    });

    const apiTracker = logger.apiRequest(
      'POST',
      '/api/v1/calls/batch/deal-assignment',
      { amo_call_ids: amoCallIds },
      {
        component: 'CallsAPI',
        action: 'batch_deal_assignment_request',
        callIdsCount: amoCallIds.length
      }
    );

    try {
      const response = await apiClient.post<Record<string, any>>(
        '/api/v1/calls/batch/deal-assignment',
        { amo_call_ids: amoCallIds }
      );

      const assignments = response.result;
      const assignmentsCount = Object.keys(assignments).length;
      const dealsFound = new Set(Object.values(assignments).map((a: any) => a?.deal_id).filter(Boolean)).size;

      logger.info('Батч-запрос о принадлежности звонков выполнен успешно', {
        component: 'CallsAPI',
        action: 'batch_deal_assignment_success',
        requested: amoCallIds.length,
        received: assignmentsCount,
        dealsFound,
        assignmentsSummary: Object.entries(assignments).map(([callId, assignment]: [string, any]) => ({
          callId,
          dealId: assignment?.deal_id || null,
          belongsToDeal: !!assignment?.deal_id
        }))
      });

      apiTracker.response(assignments);

      return assignments;
    } catch (error) {
      logger.error('Ошибка при получении принадлежности звонков к сделкам', {
        component: 'CallsAPI',
        action: 'batch_deal_assignment_error',
        callIds: amoCallIds,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));

      apiTracker.response(undefined, error instanceof Error ? error : new Error(String(error)));

      throw error;
    }
  }
}

export const callsAPI = new CallsAPI();
