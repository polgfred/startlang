import { Button } from '@base-ui/react/button';
import { Menu } from '@base-ui/react/menu';
import type { EditorMarker } from '@startlang/lang-core/editor-model';
import clsx from 'clsx';
import { memo, useCallback, useEffect } from 'react';

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
import type { RuntimeMode } from './start-environment.js';

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
    markers: [{ lineNumber: 25, marker: 'snapshot' }],
  },
  {
    name: 'Compound Interest Calculator',
    script: investScript,
    markers: [
      { lineNumber: 19, marker: 'snapshot' },
      { lineNumber: 27, marker: 'snapshot' },
      { lineNumber: 39, marker: 'snapshot' },
      { lineNumber: 44, marker: 'snapshot' },
    ],
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
    markers: [
      { lineNumber: 12, marker: 'snapshot' },
      { lineNumber: 22, marker: 'snapshot' },
    ],
  },
  {
    name: 'Victor Wireframe Plot',
    script: victorScript,
    markers: [
      { lineNumber: 11, marker: 'snapshot' },
      { lineNumber: 17, marker: 'snapshot' },
    ],
  },
  {
    name: 'Nested Group Rosette',
    script: rosetteScript,
    markers: [
      { lineNumber: 14, marker: 'snapshot' },
      { lineNumber: 21, marker: 'snapshot' },
      { lineNumber: 28, marker: 'snapshot' },
      { lineNumber: 35, marker: 'snapshot' },
      { lineNumber: 42, marker: 'snapshot' },
      { lineNumber: 46, marker: 'snapshot' },
    ],
  },
  {
    name: 'Table Cell Layout',
    script: tableCellsScript,
    markers: [
      { lineNumber: 8, marker: 'snapshot' },
      { lineNumber: 39, marker: 'snapshot' },
      { lineNumber: 45, marker: 'snapshot' },
      { lineNumber: 51, marker: 'snapshot' },
      { lineNumber: 58, marker: 'snapshot' },
      { lineNumber: 68, marker: 'snapshot' },
      { lineNumber: 83, marker: 'snapshot' },
    ],
  },
] satisfies {
  name: string;
  script: string;
  markers?: readonly EditorMarker[];
}[];

function getRuntimeStatusLabel(runtimeMode: RuntimeMode) {
  switch (runtimeMode) {
    case 'running':
      return 'Running';
    case 'input':
      return 'Waiting';
    case 'breakpoint':
    case 'continuable':
      return 'Paused';
    case 'rewound':
      return 'Rewound';
    case 'idle':
      return null;
  }
}

const CodeMenu = memo(function CodeMenu({
  runProgram,
}: {
  runProgram: () => void;
}) {
  const { editorReady, setValue } = useEditor();

  const loadScript = useCallback(
    (script: string, markers: readonly EditorMarker[]) => {
      setValue(script, { markers });
      runProgram();
    },
    [runProgram, setValue]
  );

  // load the first example when the editor mounts
  useEffect(() => {
    if (editorReady) {
      const [defaultExample] = exampleScripts;
      loadScript(defaultExample.script, defaultExample.markers ?? []);
    }
  }, [editorReady, loadScript]);

  return (
    <Menu.Root>
      <Menu.Trigger
        className={clsx(
          controls.button,
          controls.buttonText,
          styles.exampleTrigger
        )}
      >
        Examples
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className={styles.menuPositioner} sideOffset={8}>
          <Menu.Popup className={controls.menu}>
            {exampleScripts.map(({ name, script, markers }) => (
              <Menu.Item
                key={name}
                className={controls.menuItem}
                onClick={() => {
                  loadScript(script, markers ?? []);
                }}
              >
                {name}
              </Menu.Item>
            ))}
            <Menu.Separator className={controls.menuSeparator} />
            <Menu.Item
              className={controls.menuItem}
              onClick={() => {
                setValue('', { markers: [] });
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
  runtimeMode,
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
  runtimeMode: RuntimeMode;
}) {
  const toggleInspector = useCallback(() => {
    setShowInspector(!showInspector);
  }, [setShowInspector, showInspector]);
  const runtimeStatusLabel = getRuntimeStatusLabel(runtimeMode);

  return (
    <header
      className={clsx(
        styles.header,
        runtimeMode !== 'idle' && styles.headerActive,
        runtimeMode === 'running' && styles.headerRunning,
        runtimeMode === 'input' && styles.headerWaiting
      )}
    >
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
        {runtimeStatusLabel && (
          <div
            className={clsx(
              styles.statusPill,
              runtimeMode === 'running' && styles.statusPillRunning
            )}
            aria-live="polite"
          >
            <span className={styles.statusDot} aria-hidden="true" />
            {runtimeStatusLabel}
          </div>
        )}
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
