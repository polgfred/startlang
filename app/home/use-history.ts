import { useRef } from 'react';
import { AppHost, AppHostSnapshot } from '../../src/lang/ext/graphics.js';
import { Interpreter, Snapshot } from '../../src/lang/interpreter.js';

export type History = ReturnType<typeof useHistory>;

export function useHistory(interpreter: Interpreter, host: AppHost) {
  const history = useRef<Snapshot[]>([]);
  const hostHistory = useRef<AppHostSnapshot[]>([]);
  const index = useRef(0);

  return {
    isEmpty() {
      return history.current.length === 0;
    },

    get currentIndex() {
      return index.current;
    },

    get current() {
      return history.current[index.current];
    },

    get currentHost() {
      return hostHistory.current[index.current];
    },

    get length() {
      return history.current.length;
    },

    clear() {
      history.current = [];
      hostHistory.current = [];
      index.current = 0;
    },

    push() {
      history.current.push(interpreter.takeSnapshot());
      hostHistory.current.push(host.takeSnapshot());
      index.current = history.current.length - 1;
    },

    moveToIndex(nextIndex: number) {
      index.current = nextIndex;
      interpreter.restoreSnapshot(history.current[nextIndex]);
      host.restoreSnapshot(hostHistory.current[nextIndex]);
    },
  };
}
