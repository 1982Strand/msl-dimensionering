import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { open_saved_editor } from '../engine/saved-editor';
import type { SavedEditor } from '../engine/saved-editor';
import type { AutoEditResult } from '../engine/auto-edit';
import type { SaveResult, JsonValue } from '../engine/session-storage';
import { SESSION_STORAGE_KEY } from '../engine/session-storage';
import { Button } from '@/components/ui/button';
import { Notice } from './Notice';
type Result = AutoEditResult & { saved: SaveResult | null };
function useEditorState(editor: SavedEditor, isNew: boolean) {
  const [session, setSession] = useState(() => editor.snapshot());
  const [errors, setErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(!isNew),
    [refresh, setRefresh] = useState(0);
  const [externalChange, setExternalChange] = useState(false);
  useEffect(() => {
    const changed = (e: StorageEvent) => {
      if (e.storageArea === localStorage && (e.key === SESSION_STORAGE_KEY || e.key === null))
        setExternalChange(true);
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  function receive(result: Result, forceRefresh = false) {
    setErrors(result.errors);
    if (result.errors.length) return false;
    setSession(editor.snapshot());
    if (forceRefresh) setRefresh((r) => r + 1);
    if (result.saved) {
      setSaved(result.saved.ok);
      setSaveError(result.saved.ok ? null : result.saved.message);
    }
    return true;
  }
  function remember(values: Record<string, JsonValue>) {
    if (externalChange) return;
    const result = editor.setValues({ ...editor.snapshot().values, ...values });
    setSession(editor.snapshot());
    setSaved(result.ok);
    setSaveError(result.ok ? null : result.message);
  }
  return {
    editor,
    session,
    errors,
    saveError,
    saved,
    refresh,
    externalChange,
    receive,
    remember,
    setSaved,
    setSaveError,
  };
}
const Context = createContext<ReturnType<typeof useEditorState> | null>(null);
export function EditorProvider({ children }: { children: ReactNode }) {
  const [opened] = useState(() => {
    try {
      return open_saved_editor(localStorage);
    } catch {
      return { kind: 'unavailable' as const, message: 'Browserens gemte data kunne ikke læses.' };
    }
  });
  if (opened.kind !== 'ready')
    return (
      <main>
        <h1>Data kunne ikke indlæses</h1>
        <Notice kind="error" className="message error" role="alert">
          {opened.message} De eksisterende data er ikke overskrevet.
        </Notice>
        <Button onClick={() => location.reload()}>Prøv igen</Button>
      </main>
    );
  return (
    <Ready editor={opened.editor} isNew={opened.isNew}>
      {children}
    </Ready>
  );
}
function Ready({
  editor,
  isNew,
  children,
}: {
  editor: SavedEditor;
  isNew: boolean;
  children: ReactNode;
}) {
  const state = useEditorState(editor, isNew);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useEditor() {
  const state = useContext(Context);
  if (!state) throw new Error('Missing editor provider');
  return state;
}
