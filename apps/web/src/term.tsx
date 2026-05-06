import { Button } from '@base-ui/react/button';
import { Cell, CellElement } from '@startlang/lang-browser/cells';
import clsx from 'clsx';
import {
  ChangeEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import controls from './controls.module.css';
import styles from './term.module.css';

interface InputState {
  prompt: string;
  initial: string;
  onInputComplete: (value: string) => void;
}

export default memo(function Term({
  outputCells,
  inputState,
}: {
  outputCells: readonly Cell[];
  inputState: InputState | null;
}) {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (inputState) {
      setInput(inputState.initial);
    }
  }, [inputState]);

  const handleAccept = useCallback(() => {
    if (inputState) {
      inputState.onInputComplete(input);
      setInput('');
    }
  }, [input, inputState]);

  const handleChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      setInput(ev.target.value);
    },
    [setInput]
  );

  const handleKeyUp = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        handleAccept();
      }
    },
    [handleAccept]
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end' });
  });

  return (
    <div className={styles.term}>
      {inputState && (
        <div className={styles.inputRow}>
          <label className={styles.inputField}>
            <span className={controls.fieldLabel}>{inputState.prompt}</span>
            <input
              className={controls.textInput}
              type="text"
              value={input}
              onChange={handleChange}
              onKeyUp={handleKeyUp}
              autoFocus={true}
            />
          </label>
          <Button
            onClick={handleAccept}
            className={clsx(
              controls.button,
              controls.buttonPrimary,
              controls.buttonSmall
            )}
          >
            OK
          </Button>
        </div>
      )}
      <div ref={scrollRef} className={styles.output}>
        <div className={styles.outputStack}>
          {outputCells.map((cell, index) => (
            <CellElement key={index} cell={cell} />
          ))}
        </div>
      </div>
    </div>
  );
});
