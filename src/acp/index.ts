import { useSyncExternalStore } from 'react';
import { acp, type AcpSnapshot } from './client.js';

export function useAcp(): AcpSnapshot {
  return useSyncExternalStore(acp.subscribe, acp.getSnapshot, acp.getSnapshot);
}

export { acp } from './client.js';
export type {
  AcpMessage,
  AcpMessageChunk,
  AcpSessionInfo,
  AcpSnapshot,
  AcpStatus,
} from './client.js';
