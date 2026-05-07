import { Button } from '@base-ui/react/button';
import type { BrowserPresentationSnapshot } from '@startlang/lang-browser/browser';
import type { Interpreter } from '@startlang/lang-core/interpreter';
import type { RuntimeHistory } from '@startlang/lang-core/runtime-history';
import type {
  ListType,
  NamespaceType,
  RecordType,
} from '@startlang/lang-core/types';
import clsx from 'clsx';
import { ChangeEvent, JSX, memo, useCallback, useState } from 'react';

import controls from './controls.module.css';
import styles from './inspector.module.css';

export default memo(function Inspector({
  error,
  history,
  interpreter,
  updateSlider,
}: {
  error: Error | null;
  history: RuntimeHistory<BrowserPresentationSnapshot>;
  interpreter: Interpreter;
  runtimeVersion: number;
  updateSlider: (index: number) => void;
}) {
  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateSlider(Number(event.target.value));
    },
    [updateSlider]
  );

  return (
    <div className={styles.inspector}>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={Math.max(history.length - 1, 0)}
        step={1}
        value={history.index}
        onChange={handleSliderChange}
      />
      {error && <ErrorInspector error={error} />}
      {history.length > 0 && (
        <div className={styles.grid}>
          <NamespaceInspector
            title="Globals"
            namespace={interpreter.globalNamespace}
          />
          <NamespaceInspector
            title="Locals"
            namespace={interpreter.topNamespace.head}
          />
        </div>
      )}
    </div>
  );
});

function ErrorInspector({ error }: { error: Error }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th colSpan={2}>
            <h3 className={styles.title}>Error</h3>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th className={styles.nameCell}>Message</th>
          <td className={clsx(styles.valueCell, styles.error)}>
            {error.message}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const NamespaceInspector = memo(function NamespaceInspector({
  title,
  namespace,
}: {
  title: string;
  namespace: NamespaceType;
}) {
  return (
    <table className={styles.table}>
      <colgroup>
        <col style={{ width: '25%' }} />
        <col style={{ width: '75%' }} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={2}>
            <h3 className={styles.title}>{title}</h3>
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(namespace).map(([key, value]) => (
          <tr key={key}>
            <td className={styles.nameCell}>{key}</td>
            <td className={styles.valueCell}>{inspectorFor(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

function NoneInspector() {
  return <span>*none*</span>;
}

function BooleanInspector({ value }: { value: boolean }) {
  return <span>{value ? '*true*' : '*false*'}</span>;
}

function NumberInspector({ value }: { value: number }) {
  return (
    <span>
      {isFinite(value)
        ? Math.round((value + Number.EPSILON) * 1e6) / 1e6
        : value > 0
          ? '*infinity*'
          : '-*infinity'}
    </span>
  );
}

function StringInspector({ value }: { value: string }) {
  return <span>{value}</span>;
}

function ExpandableFooter({
  total,
  visible,
  setVisible,
}: {
  total: number;
  visible: number;
  setVisible: (visible: number) => void;
}) {
  return (
    <tfoot>
      <tr>
        <td colSpan={2}>
          {visible > 5 && (
            <Button
              onClick={() => {
                setVisible(visible - 5);
              }}
              className={clsx(
                controls.button,
                controls.buttonBare,
                styles.footerButton
              )}
            >
              Less
            </Button>
          )}
          {visible < total && (
            <Button
              onClick={() => {
                setVisible(visible + 5);
              }}
              className={clsx(
                controls.button,
                controls.buttonBare,
                styles.footerButton
              )}
            >
              More
            </Button>
          )}
        </td>
      </tr>
    </tfoot>
  );
}

const ListInspector = memo(function ListInspector({
  value,
}: {
  value: ListType;
}) {
  const [visible, setVisible] = useState(5);

  const rows: JSX.Element[] = [];
  for (let i = 0; i < Math.min(visible, value.length); i++) {
    rows.push(
      <tr key={i}>
        <td>{inspectorFor(value[i])}</td>
      </tr>
    );
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.valueCell}>Items</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
      <ExpandableFooter
        total={value.length}
        visible={visible}
        setVisible={setVisible}
      />
    </table>
  );
});

const RecordInspector = memo(function RecordInspector({
  value,
}: {
  value: RecordType;
}) {
  const [visible, setVisible] = useState(5);

  const keys = Object.keys(value);
  const rows: JSX.Element[] = [];
  for (let i = 0; i < Math.min(visible, keys.length); i++) {
    rows.push(
      <tr key={i}>
        <td>{inspectorFor(keys[i])}</td>
        <td>{inspectorFor(value[keys[i]])}</td>
      </tr>
    );
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.nameCell}>Key</th>
          <th className={styles.valueCell}>Value</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
      <ExpandableFooter
        total={keys.length}
        visible={visible}
        setVisible={setVisible}
      />
    </table>
  );
});

function inspectorFor(value: unknown) {
  if (value === null || value === undefined) {
    return <NoneInspector />;
  } else {
    switch (typeof value) {
      case 'boolean':
        return <BooleanInspector value={value} />;
      case 'number':
        return <NumberInspector value={value} />;
      case 'string':
        return <StringInspector value={value} />;
      case 'object':
        if (Array.isArray(value)) {
          return <ListInspector value={value} />;
        } else {
          return <RecordInspector value={value as RecordType} />;
        }
      default:
        throw new Error(`could not determine type for ${value}`);
    }
  }
}
