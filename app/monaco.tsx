import { editor as ed } from 'monaco-editor';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

import { Node } from '../src/lang/nodes';
import { parse } from '../src/lang/parser.peggy';
import { MarkerType } from '../src/lang/types';

interface EditorContext {
  getMarkers(): MarkerType[];
  getEditor(): ed.IStandaloneCodeEditor | null;
  setEditor(editor: ed.IStandaloneCodeEditor): void;
  getValue(): string;
  setValue(value: string | null): void;
  parseValue(): Node;
  autoLayout(): void;
}

const EditorContext = createContext<EditorContext | null>(null);

export function useEditor() {
  const editor = useContext(EditorContext);
  if (!editor) {
    throw new Error('Editor not found');
  }
  return editor;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const editorRef = useRef<ed.IStandaloneCodeEditor | null>(null);
  const markersRef = useRef<MarkerType[]>([]);

  const requireEditor = useCallback(() => {
    if (!editorRef.current) {
      throw new Error('Editor not found');
    }
    return editorRef.current;
  }, []);

  const context: EditorContext = useMemo(
    () => ({
      getMarkers() {
        return markersRef.current;
      },
      getEditor() {
        return editorRef.current;
      },
      setEditor(editor) {
        editorRef.current = editor;
      },
      getValue() {
        return requireEditor().getValue() + '\n';
      },
      setValue(value: string | null) {
        requireEditor().setValue(value ?? '\n');
      },
      parseValue() {
        return parse(requireEditor().getValue() + '\n');
      },
      autoLayout() {
        // @ts-expect-error 'auto' is allowed
        editorRef.current?.layout({ width: 'auto', height: 'auto' });
      },
    }),
    [requireEditor, markersRef]
  );

  return (
    <EditorContext.Provider value={context}>{children}</EditorContext.Provider>
  );
}
