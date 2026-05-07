import { Button } from '@base-ui/react/button';
import type { BrowserPresentationSnapshot } from '@startlang/lang-browser/browser';
import type { Interpreter } from '@startlang/lang-core/interpreter';
import type { RuntimeHistory } from '@startlang/lang-core/runtime-history';
import type {
  IndexType,
  NamespaceType,
  RecordType,
} from '@startlang/lang-core/types';
import clsx from 'clsx';
import {
  type ChangeEvent,
  type CSSProperties,
  type JSX,
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react';

import controls from './controls.module.css';
import styles from './inspector.module.css';

type InspectorScope = 'global' | 'local';

export default memo(function Inspector({
  error,
  history,
  interpreter,
  canEditValues,
  onValueChange,
  updateSlider,
}: {
  error: Error | null;
  history: RuntimeHistory<BrowserPresentationSnapshot>;
  interpreter: Interpreter;
  runtimeVersion: number;
  canEditValues: boolean;
  onValueChange: (
    scope: InspectorScope,
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) => boolean;
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
      <div className={styles.timeline}>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={Math.max(history.length - 1, 0)}
          step={1}
          value={history.index}
          onChange={handleSliderChange}
        />
        <span className={styles.timelineLabel}>
          {history.length > 0 ? history.index + 1 : 0}/{history.length}
        </span>
      </div>
      {error && <ErrorInspector error={error} />}
      {history.length > 0 && (
        <div className={styles.grid}>
          <NamespaceInspector
            title="Globals"
            scope="global"
            namespace={interpreter.globalNamespace}
            canEditValues={canEditValues}
            onValueChange={onValueChange}
          />
          <NamespaceInspector
            title="Locals"
            scope="local"
            namespace={interpreter.topNamespace.head}
            canEditValues={canEditValues}
            onValueChange={onValueChange}
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
  scope,
  namespace,
  canEditValues,
  onValueChange,
}: {
  title: string;
  scope: InspectorScope;
  namespace: NamespaceType;
  canEditValues: boolean;
  onValueChange: (
    scope: InspectorScope,
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) => boolean;
}) {
  const entries = Object.entries(namespace);

  return (
    <section className={styles.namespace}>
      <header className={styles.namespaceHeader}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.count}>{entries.length}</span>
      </header>
      {entries.length === 0 ? (
        <div className={styles.empty}>No values</div>
      ) : (
        <div className={styles.tree}>
          {entries.map(([key, value]) => (
            <ValueNode
              key={key}
              label={key}
              value={value}
              scope={scope}
              variableName={key}
              indexes={[]}
              depth={0}
              canEditValues={canEditValues}
              onValueChange={onValueChange}
            />
          ))}
        </div>
      )}
    </section>
  );
});

function ValueNode({
  label,
  value,
  scope,
  variableName,
  indexes,
  depth,
  canEditValues,
  onValueChange,
}: {
  label: string;
  value: unknown;
  scope: InspectorScope;
  variableName: string;
  indexes: readonly IndexType[];
  depth: number;
  canEditValues: boolean;
  onValueChange: (
    scope: InspectorScope,
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) => boolean;
}) {
  const isList = Array.isArray(value);
  const isRecord =
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const isExpandable = isList || isRecord;
  const [isOpen, setIsOpen] = useState(depth === 0);
  const [visible, setVisible] = useState(12);

  useEffect(() => {
    setVisible(12);
  }, [value]);

  const handleToggle = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const children: JSX.Element[] = [];
  const childCount = isList
    ? value.length
    : isRecord
      ? Object.keys(value as RecordType).length
      : 0;

  if (isList) {
    for (let i = 0; i < Math.min(visible, value.length); i++) {
      children.push(
        <ValueNode
          key={i}
          label={String(i + 1)}
          value={value[i]}
          scope={scope}
          variableName={variableName}
          indexes={[...indexes, i + 1]}
          depth={depth + 1}
          canEditValues={canEditValues}
          onValueChange={onValueChange}
        />
      );
    }
  } else if (isRecord) {
    const keys = Object.keys(value as RecordType);
    for (let i = 0; i < Math.min(visible, keys.length); i++) {
      const key = keys[i];
      children.push(
        <ValueNode
          key={key}
          label={key}
          value={(value as RecordType)[key]}
          scope={scope}
          variableName={variableName}
          indexes={[...indexes, key]}
          depth={depth + 1}
          canEditValues={canEditValues}
          onValueChange={onValueChange}
        />
      );
    }
  }

  return (
    <div className={styles.node}>
      <div
        className={styles.nodeRow}
        style={{ '--depth': depth } as CSSProperties}
      >
        <div className={styles.nodeLabel}>
          {isExpandable ? (
            <Button
              onClick={handleToggle}
              className={styles.disclosureButton}
              aria-label={isOpen ? 'Collapse value' : 'Expand value'}
            >
              {isOpen ? '-' : '+'}
            </Button>
          ) : (
            <span className={styles.disclosureSpacer} />
          )}
          <span className={styles.key}>{label}</span>
        </div>
        <div className={styles.nodeValue}>
          {isExpandable ? (
            <span className={styles.summary}>{summaryFor(value)}</span>
          ) : (
            <PrimitiveEditor
              value={value}
              disabled={!canEditValues}
              onChange={(nextValue) => {
                return onValueChange(scope, variableName, indexes, nextValue);
              }}
            />
          )}
        </div>
      </div>
      {isExpandable && isOpen && (
        <div className={styles.children}>
          {children}
          {childCount > 0 && (
            <div
              className={styles.moreRow}
              style={{ '--depth': depth + 1 } as CSSProperties}
            >
              {visible > 12 && (
                <Button
                  onClick={() => {
                    setVisible(Math.max(12, visible - 12));
                  }}
                  className={clsx(
                    controls.button,
                    controls.buttonBare,
                    styles.moreButton
                  )}
                >
                  Less
                </Button>
              )}
              {visible < childCount && (
                <Button
                  onClick={() => {
                    setVisible(visible + 12);
                  }}
                  className={clsx(
                    controls.button,
                    controls.buttonBare,
                    styles.moreButton
                  )}
                >
                  More
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrimitiveEditor({
  value,
  disabled,
  onChange,
}: {
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => editableTextFor(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(editableTextFor(value));
    setError(null);
    setIsEditing(false);
  }, [value]);

  const commit = useCallback(() => {
    const parsed = parseEditedValue(value, draft);
    if (parsed instanceof Error) {
      setError(parsed.message);
      return;
    }

    if (!onChange(parsed)) {
      return;
    }

    setIsEditing(false);
  }, [draft, onChange, value]);

  const cancel = useCallback(() => {
    setDraft(editableTextFor(value));
    setError(null);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commit();
      } else if (event.key === 'Escape') {
        cancel();
      }
    },
    [cancel, commit]
  );

  if (typeof value === 'boolean' && isEditing) {
    return (
      <span className={styles.editor}>
        <select
          className={styles.select}
          value={value ? 'true' : 'false'}
          onChange={(event) => {
            if (onChange(event.target.value === 'true')) {
              setIsEditing(false);
            }
          }}
          autoFocus
        >
          <option value="true">*true*</option>
          <option value="false">*false*</option>
        </select>
        <Button
          onClick={cancel}
          className={clsx(
            controls.button,
            controls.buttonBare,
            styles.actionButton
          )}
        >
          Cancel
        </Button>
      </span>
    );
  }

  if (!isEditing) {
    return (
      <span className={styles.valuePreview}>
        <span className={styles.scalar}>{displayValueFor(value)}</span>
        {!disabled && (
          <Button
            onClick={() => {
              setIsEditing(true);
            }}
            className={clsx(
              controls.button,
              controls.buttonBare,
              styles.actionButton
            )}
          >
            Edit
          </Button>
        )}
      </span>
    );
  }

  return (
    <span className={styles.editor}>
      <input
        className={clsx(styles.input, error && styles.inputError)}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <Button
        onClick={commit}
        className={clsx(
          controls.button,
          controls.buttonBare,
          styles.actionButton
        )}
      >
        Save
      </Button>
      <Button
        onClick={cancel}
        className={clsx(
          controls.button,
          controls.buttonBare,
          styles.actionButton
        )}
      >
        Cancel
      </Button>
      {error && <span className={styles.editError}>{error}</span>}
    </span>
  );
}

function summaryFor(value: unknown) {
  if (Array.isArray(value)) {
    return `List (${value.length})`;
  }
  if (typeof value === 'object' && value !== null) {
    const size = Object.keys(value as RecordType).length;
    return `Record (${size})`;
  }
  return displayValueFor(value);
}

function displayValueFor(value: unknown) {
  if (value === null || value === undefined) {
    return '*none*';
  }
  switch (typeof value) {
    case 'boolean':
      return value ? '*true*' : '*false*';
    case 'number':
      return numberTextFor(value);
    case 'string':
      return value;
    default:
      return String(value);
  }
}

function editableTextFor(value: unknown) {
  if (typeof value === 'number') {
    return numberTextFor(value).replaceAll('*', '');
  }
  if (value === null || value === undefined) {
    return 'none';
  }
  return String(value);
}

function numberTextFor(value: number) {
  return isFinite(value)
    ? String(Math.round((value + Number.EPSILON) * 1e6) / 1e6)
    : value > 0
      ? '*infinity*'
      : '-*infinity*';
}

function parseEditedValue(originalValue: unknown, draft: string) {
  if (typeof originalValue === 'number') {
    const normalized = draft.trim().replaceAll('*', '').toLowerCase();
    if (normalized === 'infinity' || normalized === '+infinity') {
      return Infinity;
    }
    if (normalized === '-infinity') {
      return -Infinity;
    }

    const value = Number(draft);
    return Number.isNaN(value) ? new Error('Enter a number') : value;
  }

  if (originalValue === null || originalValue === undefined) {
    const normalized = draft.trim().toLowerCase();
    if (normalized === 'none') {
      return null;
    }
    if (normalized === 'true' || normalized === '*true*') {
      return true;
    }
    if (normalized === 'false' || normalized === '*false*') {
      return false;
    }
    const value = Number(draft);
    return Number.isNaN(value) ? draft : value;
  }

  return draft;
}
