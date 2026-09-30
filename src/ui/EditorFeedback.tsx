import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditor } from './EditorContext';

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
        <div className="message warning" role="alert">
          Data er ændret i en anden fane.{' '}
          <Button onClick={() => location.reload()}>Genindlæs data</Button>
        </div>
      )}
      {ctx.errors.map((message) => (
        <div className="message error" role="alert" key={message}>
          {message}
        </div>
      ))}
      {ctx.saveError && (
        <div className="message error" role="alert">
          {ctx.saveError} Ændringerne er stadig i denne åbne fane.
          <Button
            disabled={ctx.externalChange}
            onClick={() => {
              const result = ctx.editor.retrySave();
              ctx.setSaved(result.ok);
              ctx.setSaveError(result.ok ? null : result.message);
            }}
          >
            Prøv at gemme igen
          </Button>
        </div>
      )}
    </>
  );
}
