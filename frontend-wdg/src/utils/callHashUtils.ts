import { sha256Hash } from './hash';
import { Call } from '../types/models';
import { logger } from './logger';

interface CallWithHash {
  call: Call;
  hash: string;
}

interface CallAssignmentMap {
  [callId: string]: {
    hash: string;
    assignment: any;
  };
}

export async function computeCallHashes(calls: Call[]): Promise<CallWithHash[]> {
  const callsWithHashes: CallWithHash[] = [];

  for (const call of calls) {
    if (!call.link) {
      logger.debug('Пропуск звонка без ссылки при вычислении хеша', {
        component: 'callHashUtils',
        callId: call.id
      });
      continue;
    }

    try {
      const hash = await sha256Hash(call.link);
      callsWithHashes.push({ call, hash });
    } catch (error) {
      logger.error('Ошибка при вычислении хеша звонка', {
        component: 'callHashUtils',
        callId: call.id,
        link: call.link,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return callsWithHashes;
}

export function createCallAssignmentMap(
  callsWithHashes: CallWithHash[],
  assignmentsByHash: Record<string, any>
): CallAssignmentMap {
  const map: CallAssignmentMap = {};

  for (const { call, hash } of callsWithHashes) {
    const assignment = assignmentsByHash[hash];
    map[call.id] = {
      hash,
      assignment: assignment || null
    };
  }

  return map;
}

