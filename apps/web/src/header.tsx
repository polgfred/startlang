import { Button } from '@base-ui/react/button';
import { Menu } from '@base-ui/react/menu';
import clsx from 'clsx';
import { memo, useCallback } from 'react';

import boxScript from '../tests/box.start';
import investScript from '../tests/invest.start';
import numguessScript from '../tests/numguess.start';
import rosetteScript from '../tests/rosette.start';
import sieveScript from '../tests/sieve.start';
import sineScript from '../tests/sine.start';
import tableCellsScript from '../tests/table-cells.start';
import victorScript from '../tests/victor.start';

import controls from './controls.module.css';
import { useEditor } from './editor-context.jsx';
import styles from './header.module.css';

type OutputTab = 'graphics' | 'text';

const SocialIcon = memo(function SocialIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className={styles.socialIcon}
      style={{
        mask: `url(${src}) center / contain no-repeat`,
        WebkitMask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
});

const OutputSwitcher = memo(function OutputSwitcher({
  outputTab,
  setOutputTab,
  hasGraphicsOutput,
  hasTextOutput,
}: {
  outputTab: OutputTab;
  setOutputTab: (value: OutputTab) => void;
  hasGraphicsOutput: boolean;
  hasTextOutput: boolean;
}) {
  const showGraphics = useCallback(() => {
    setOutputTab('graphics');
  }, [setOutputTab]);

  const showText = useCallback(() => {
    setOutputTab('text');
  }, [setOutputTab]);

  return (
    <div className={styles.buttonGroup}>
      <span
        className={clsx(
          styles.badge,
          outputTab !== 'graphics' && hasGraphicsOutput && styles.badgeDot
        )}
      >
        <Button
          onClick={showGraphics}
          className={clsx(
            controls.button,
            styles.headerButton,
            styles.buttonLeft,
            outputTab === 'graphics' && styles.buttonActive
          )}
        >
          Graphics
        </Button>
      </span>
      <span
        className={clsx(
          styles.badge,
          outputTab !== 'text' && hasTextOutput && styles.badgeDot
        )}
      >
        <Button
          onClick={showText}
          className={clsx(
            controls.button,
            styles.headerButton,
            styles.buttonRight,
            outputTab === 'text' && styles.buttonActive
          )}
        >
          Text
        </Button>
      </span>
    </div>
  );
});

const exampleScripts = [
  {
    name: 'Stacking Boxes',
    script: boxScript,
  },
  {
    name: 'Compound Interest Calculator',
    script: investScript,
  },
  {
    name: 'Number Guessing Game',
    script: numguessScript,
  },
  {
    name: 'Sieve of Eratosthenes',
    script: sieveScript,
  },
  {
    name: 'Sine Curve Plot',
    script: sineScript,
  },
  {
    name: 'Victor Wireframe Plot',
    script: victorScript,
  },
  {
    name: 'Nested Group Rosette',
    script: rosetteScript,
  },
  {
    name: 'Table Cell Layout',
    script: tableCellsScript,
  },
];

const CodeMenu = memo(function CodeMenu({
  runProgram,
}: {
  runProgram: () => void;
}) {
  const { setValue } = useEditor();

  const loadScript = useCallback(
    (script: string) => {
      setValue(script, { clearMarkers: true });
      runProgram();
    },
    [runProgram, setValue]
  );

  return (
    <Menu.Root>
      <Menu.Trigger className={clsx(controls.button, controls.buttonText)}>
        Examples
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className={styles.menuPositioner} sideOffset={8}>
          <Menu.Popup className={controls.menu}>
            {exampleScripts.map(({ name, script }) => (
              <Menu.Item
                key={name}
                className={controls.menuItem}
                onClick={() => {
                  loadScript(script);
                }}
              >
                {name}
              </Menu.Item>
            ))}
            <Menu.Separator className={controls.menuSeparator} />
            <Menu.Item
              className={controls.menuItem}
              onClick={() => {
                setValue('', { clearMarkers: true });
              }}
            >
              New
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
});

export default memo(function Header({
  outputTab,
  setOutputTab,
  hasGraphicsOutput,
  hasTextOutput,
  isProgramActive,
  showInspector,
  setShowInspector,
  runExample,
  runProgram,
  runLabel,
  stepProgram,
  isStepDisabled,
  stopProgram,
  isStopDisabled,
}: {
  outputTab: OutputTab;
  setOutputTab: (value: OutputTab) => void;
  hasGraphicsOutput: boolean;
  hasTextOutput: boolean;
  isProgramActive: boolean;
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
  runExample: () => void;
  runProgram: () => void;
  runLabel: string;
  stepProgram: () => void;
  isStepDisabled: boolean;
  stopProgram: () => void;
  isStopDisabled: boolean;
}) {
  const toggleInspector = useCallback(() => {
    setShowInspector(!showInspector);
  }, [setShowInspector, showInspector]);

  return (
    <header className={styles.header}>
      <div className={styles.toolbar}>
        <div className={styles.brand}>START</div>
        <CodeMenu runProgram={runExample} />
        <OutputSwitcher
          outputTab={outputTab}
          setOutputTab={setOutputTab}
          hasGraphicsOutput={hasGraphicsOutput}
          hasTextOutput={hasTextOutput}
        />
        <Button
          onClick={toggleInspector}
          className={clsx(
            controls.button,
            styles.headerButton,
            showInspector && styles.buttonPressed
          )}
        >
          Inspector
        </Button>
        <Button
          disabled={isProgramActive}
          onClick={runProgram}
          className={clsx(
            controls.button,
            controls.buttonPrimary,
            styles.headerButton,
            styles.runButton
          )}
        >
          {runLabel}
        </Button>
        <Button
          disabled={isStepDisabled}
          onClick={stepProgram}
          className={clsx(
            controls.button,
            styles.headerButton,
            styles.stepButton
          )}
        >
          Step
        </Button>
        <Button
          disabled={isStopDisabled}
          onClick={stopProgram}
          className={clsx(
            controls.button,
            styles.headerButton,
            styles.stopButton
          )}
        >
          Stop
        </Button>
      </div>
      <div className={styles.toolbar}>
        <a
          href="https://linkedin.com/in/polgfred"
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
          className={styles.socialLink}
        >
          <SocialIcon src="/linkedin-logo.svg" />
        </a>
        <a
          href="https://github.com/polgfred/startlang"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className={styles.socialLink}
        >
          <SocialIcon src="/github-logo.svg" />
        </a>
      </div>
    </header>
  );
});
