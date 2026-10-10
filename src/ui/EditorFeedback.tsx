import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditor } from './EditorContext';
import { Notice } from './Notice';

export function SaveState() {
  const { saveError, saved } = useEditor();
  return (
    <div className="save-state" role="status">
      {saveError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
      <span>{saveError ? 'Ikke gemt' : saved ? 'Gemt i denne browser' : 'Standarddata'}</span>
    </div>
  );
}

export function EditorFeedback() {
  const ctx = useEditor();
  return (
    <>
      {ctx.externalChange && (
        <Notice kind="warning" className="message warning" role="alert">
          Data er ændret i en anden fane.{' '}
          <Button size="sm" onClick={() => location.reload()}>
            Genindlæs data
          </Button>
        </Notice>
      )}
      {ctx.errors.map((message) => (
        <Notice kind="error" className="message error" role="alert" key={message}>
          {message}
        </Notice>
      ))}
      {ctx.saveError && (
        <Notice kind="error" className="message error" role="alert">
          {ctx.saveError} Ændringerne er stadig i denne åbne fane.
          <Button
            size="sm"
            disabled={ctx.externalChange}
            onClick={() => {
              const result = ctx.editor.retrySave();
              ctx.setSaved(result.ok);
              ctx.setSaveError(result.ok ? null : result.message);
            }}
          >
            Prøv at gemme igen
          </Button>
        </Notice>
      )}
    </>
  );
}
