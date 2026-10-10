import { Cell } from './Cell';
import { useEditor } from './EditorContext';
import { useState } from 'react';
import { Undo2, Redo2, RotateCcw, Plus, Trash2, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SaveState } from './EditorFeedback';
import { HintText, IconTip } from './Hint';
import { Notice } from './Notice';
import { PageFooter, PageHeader } from './page';
import { review_table, type ReviewedRow } from '../engine/edit-review';
import type { EditableMaterial } from '../engine/editing';

type Field = Exclude<keyof EditableMaterial, 'lagtype'>;
const columns: {
  field: Field;
  label: string;
  numeric?: boolean;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  help?: string;
}[] = [
  { field: 'navn', label: 'Materiale', required: true },
  {
    field: 'phi',
    label: 'φᵢ (°)',
    numeric: true,
    min: 20,
    max: 60,
    step: 1,
    required: true,
    help: 'Materialets friktionsvinkel. Værdien kan tilpasses lokalt; standardværdien gendannes med Nulstil til standard.',
  },
  { field: 'max_korn', label: 'Maks. korn (mm)', numeric: true, min: 0, max: 500, step: 1 },
  {
    field: 'krav_maskestoerrelse_mm',
    label: 'Krav til geonet — maskestørrelse (mm)',
    numeric: true,
    min: 0,
    max: 500,
    step: 5,
    help: 'Minimum kvadratisk maskestørrelse i mm som materialet kræver af et biaksialt geonet. Sammenlignes kun med biaksiale net i Brugerdefineret-tilstand.',
  },
  { field: 'anvendelse', label: 'Bemærkning' },
];

export function Materials() {
  const {
    editor,
    session,
    errors,
    saveError,
    refresh,
    externalChange,
    receive,
    setSaved,
    setSaveError,
  } = useEditor();
  const [onlyChanged, setOnlyChanged] = useState(false);
  function change(index: number, field: Field, value: unknown) {
    if (externalChange) return false;
    const materials = editor.snapshot().data.materialer;
    const next = materials.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    const result = editor.edit({ section: 'materialer', value: next });
    return receive(result, true);
  }
  function remove(index: number) {
    receive(
      editor.edit({
        section: 'materialer',
        value: editor.snapshot().data.materialer.filter((_, i) => i !== index),
      }),
      true,
    );
  }
  function restore(row: ReviewedRow, field?: Field) {
    receive(
      editor.restoreDefault({
        table: { section: 'materialer' },
        key: row.key,
        index: row.index,
        field,
      }),
      true,
    );
  }
  const all = review_table(session.data, { section: 'materialer' });
  const changes = all.filter((r) => r.kind !== 'unchanged');
  const alteredPhi = all
    .filter((r) => r.kind === 'changed' && r.changedFields.includes('phi'))
    .map((r) => r.key);
  const [newRows, setNewRows] = useState<Record<string, Record<string, unknown>>>({});
  function newCell(group: string, field: Field, value: unknown) {
    const draft = { ...newRows[group], [field]: value, lagtype: group };
    if (String(draft.navn ?? '').trim() && typeof draft.phi === 'number') {
      const result = editor.edit({
        section: 'materialer',
        value: [...editor.snapshot().data.materialer, draft],
      });
      if (receive(result, true)) {
        setNewRows((rows) => {
          const next = { ...rows };
          delete next[group];
          return next;
        });
        return true;
      }
      setNewRows((rows) => ({ ...rows, [group]: draft }));
      return false;
    }
    setNewRows((rows) => ({ ...rows, [group]: draft }));
    return true;
  }
  return (
    <main>
      <PageHeader
        page="materialer"
        title="Materialer"
        intro="Friktionsvinkler og kornstørrelser anvendt i dimensioneringen. Værdierne kan tilpasses; ændringer gemmes lokalt og indgår i beregningen i Brugerdefineret-tilstand."
        aside={<SaveState />}
      />
      <div className="toolbar">
        <div className="toolbar-group">
          <Button
            variant="outline"
            size="sm"
            disabled={!editor.canUndo || externalChange}
            onClick={() => receive(editor.undo(), true)}
          >
            <Undo2 />
            Fortryd
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!editor.canRedo || externalChange}
            onClick={() => receive(editor.redo(), true)}
          >
            <Redo2 />
            Gentag
          </Button>
          <div className="filter">
            <Checkbox
              id="materials-only-changed"
              checked={onlyChanged}
              onCheckedChange={(checked) => setOnlyChanged(checked === true)}
            />
            <Label htmlFor="materials-only-changed">
              Vis kun ændringer <Badge variant="secondary">{changes.length}</Badge>
            </Label>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={externalChange}
          onClick={() => {
            receive(editor.edit({ reset: 'materialer' }), true);
            setNewRows({});
          }}
        >
          <RotateCcw />
          Nulstil til standard
        </Button>
      </div>
      {externalChange && (
        <Notice kind="warning" className="message warning" role="alert">
          Data er ændret i en anden fane. Genindlæs siden, før der redigeres videre.
          <br />
          <Button variant="outline" size="sm" onClick={() => location.reload()}>
            Genindlæs data
          </Button>
        </Notice>
      )}
      {saveError && (
        <Notice kind="error" className="message error" role="alert">
          <div>
            {saveError} Ændringerne er stadig i denne åbne fane.{' '}
            <Button
              variant="outline"
              size="sm"
              disabled={externalChange}
              onClick={() => {
                const result = editor.retrySave();
                setSaved(result.ok);
                setSaveError(result.ok ? null : result.message);
              }}
            >
              Prøv at gemme igen
            </Button>
          </div>
        </Notice>
      )}
      {errors.map((error) => (
        <Notice kind="error" className="message error" role="alert" key={error}>
          {error}
        </Notice>
      ))}
      {alteredPhi.length > 0 && (
        <Notice kind="warning" className="message warning">
          Friktionsvinklen afviger fra standarden for <strong>{alteredPhi.join(', ')}</strong>. Brug{' '}
          <i>Nulstil til standard</i> for at gendanne værdierne.
        </Notice>
      )}
      <fieldset disabled={externalChange} className="m-0 min-w-0 border-0 p-0">
        {(['Bærelag', 'Bundsikring'] as const).map((group, gi) => {
          const current = all.filter(
            (r) => r.current?.lagtype === group && (!onlyChanged || r.kind !== 'unchanged'),
          );
          const removed = all.filter((r) => r.kind === 'removed' && r.standard?.lagtype === group);
          return (
            <section className="section-card" key={group} aria-labelledby={`group-${gi}`}>
              <div className="section-heading">
                <div className="section-title">
                  <span className="section-number">{gi + 1}</span>
                  <div>
                    <h2 id={`group-${gi}`}>
                      {group === 'Bærelag' ? 'Bærelagsmaterialer' : 'Bundsikringsmaterialer'}
                    </h2>
                    <div className="section-meta">
                      {session.data.materialer.filter((m) => m.lagtype === group).length} materialer
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!!newRows[group]}
                  onClick={() =>
                    setNewRows((rows) => ({
                      ...rows,
                      [group]: {
                        navn: '',
                        phi: null,
                        max_korn: null,
                        krav_maskestoerrelse_mm: null,
                        anvendelse: '',
                        lagtype: group,
                      },
                    }))
                  }
                >
                  <Plus />
                  Tilføj materiale
                </Button>
              </div>
              <div className="table-wrap">
                <table className="data-table materials-table" aria-label={`${group} materialer`}>
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c.field} scope="col" className={c.numeric ? 'num' : undefined}>
                          {c.help ? <HintText content={c.help}>{c.label}</HintText> : c.label}
                        </th>
                      ))}
                      <th scope="col">
                        <span className="sr-only">Handlinger</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.map((row) => (
                      <tr key={row.index}>
                        {columns.map((column) => (
                          <Cell
                            key={column.field}
                            column={column}
                            value={row.current![column.field]}
                            label={`${column.label} · ${row.key}`}
                            changed={row.changedFields.includes(column.field)}
                            standard={row.standard?.[column.field]}
                            commit={(v) => change(row.index!, column.field, v)}
                            restore={
                              row.standard && row.changedFields.includes(column.field)
                                ? () => restore(row, column.field)
                                : undefined
                            }
                            refresh={refresh}
                          />
                        ))}
                        <td>
                          <div className="row-actions">
                            {row.kind === 'added' && <Badge variant="secondary">Ny</Badge>}
                            {row.kind === 'changed' && (
                              <IconTip label="Gendan rækkens standardværdier">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Gendan række · ${row.key}`}
                                  onClick={() => restore(row)}
                                >
                                  <RotateCcw size={15} />
                                </Button>
                              </IconTip>
                            )}
                            <IconTip label="Slet materiale">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Slet · ${row.key}`}
                                onClick={() => remove(row.index!)}
                              >
                                <Trash2 size={15} />
                              </Button>
                            </IconTip>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {newRows[group] && (
                      <tr>
                        {columns.map((column) => (
                          <Cell
                            key={column.field}
                            column={column}
                            value={newRows[group][column.field]}
                            label={`${column.label} · Nyt ${group}`}
                            changed={false}
                            standard={null}
                            commit={(v) => newCell(group, column.field, v)}
                            refresh={refresh}
                          />
                        ))}
                        <td>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Fjern tom række · ${group}`}
                            onClick={() =>
                              setNewRows((rows) => {
                                const next = { ...rows };
                                delete next[group];
                                return next;
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {current.length === 0 && !newRows[group] && (
                <div className="empty">
                  {onlyChanged
                    ? 'Ingen ændrede materialer i denne gruppe.'
                    : 'Ingen materialer i denne gruppe.'}
                </div>
              )}
              {removed.map((row) => (
                <div className="removed-row" key={row.key}>
                  <span>
                    <strong>{row.key}</strong> · Fjernet fra standardlisten
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => restore(row)}>
                    <RotateCcw />
                    Gendan række
                  </Button>
                </div>
              ))}
            </section>
          );
        })}
      </fieldset>
      <PageFooter>Gyldige ændringer gemmes automatisk, når feltet forlades.</PageFooter>
    </main>
  );
}
