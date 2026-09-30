import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Undo2,
  Redo2,
  RotateCcw,
  Plus,
  Trash2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditor } from './EditorContext';
import { Cell } from './Cell';
import { RawChart } from './RawChart';
import { CorrelationExample } from './CorrelationExample';
import guidance from '../engine/table-guidance.json';
import { outsideRuleLine } from '../engine/table-explanation';
import { review_table, type ReviewedRow, type TableSelection } from '../engine/edit-review';
import { berig_koersel_raekker } from '../engine/editing';
import { aktivt_beregningsgrundlag } from '../engine/auto-edit';
import {
  diagramCoverage,
  readPoint,
  runColumns,
  runsCsv,
  correlationRows,
  asphaltRows,
  type TableColumn,
} from '../engine/table-presentation';

const diagramColumns: TableColumn[] = [
  { field: 'eu', label: 'Eᵤ (MPa)', numeric: true, min: 0, step: 1 },
  {
    field: 't_uarmeret_cm',
    label: 'Ustabiliseret tykkelse (cm)',
    numeric: true,
    min: 0,
    step: 0.1,
  },
  { field: 't_1_lag_cm', label: '1 lag tykkelse (cm)', numeric: true, min: 0, step: 0.1 },
  { field: 't_2_lag_cm', label: '2 lag tykkelse (cm)', numeric: true, min: 0, step: 0.1 },
];
function ReadTable({ rows, label }: { rows: Record<string, unknown>[]; label: string }) {
  if (!rows.length) return null;
  return (
    <div className="table-wrap">
      <table className="summary-table" aria-label={label}>
        <thead>
          <tr>
            {Object.keys(rows[0]).map((k) => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {Object.values(r).map((v, j) => (
                <td key={j}>{String(v ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function DataTables({ mode }: { mode: 'diagrammer' | 'vejdim' }) {
  const ctx = useEditor(),
    { editor, session, refresh, receive, externalChange } = ctx;
  const isDiagram = mode === 'diagrammer';
  const [nr, setNr] = useState(() => {
    const n = Number(session.values.diagram_nr);
    return session.data.designdiagrammer.some((d) => d.diagram_nr === n) ? n : 1;
  });
  const [onlyChanged, setOnlyChanged] = useState(false),
    [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const diagram = session.data.designdiagrammer.find((d) => d.diagram_nr === nr)!;
  const table: TableSelection = isDiagram
    ? { section: 'designdiagrammer', diagram_nr: nr }
    : { section: 'vejdim_koersel_raekker' };
  const all = review_table(session.data, table),
    changed = all.filter((r) => r.kind !== 'unchanged');
  const enriched = berig_koersel_raekker(session.data.vejdim_koersel_raekker);
  const rows = all.filter((r) => r.current && (!onlyChanged || r.kind !== 'unchanged'));
  const columns = isDiagram ? diagramColumns : runColumns;
  function editRows(value: unknown[]) {
    const state = editor.snapshot().data;
    const edit = isDiagram
      ? {
          section: 'designdiagrammer' as const,
          value: state.designdiagrammer.map((d) =>
            d.diagram_nr === nr ? { ...d, rows: value } : d,
          ),
        }
      : { section: 'vejdim_koersel_raekker' as const, value };
    return receive(editor.edit(edit), true);
  }
  function activeRows(): Record<string, unknown>[] {
    const s = editor.snapshot().data;
    return isDiagram
      ? s.designdiagrammer.find((d) => d.diagram_nr === nr)!.rows.map((r) => ({ ...r }))
      : s.vejdim_koersel_raekker;
  }
  function commit(row: ReviewedRow, field: string, value: unknown) {
    if (externalChange) return false;
    return editRows(activeRows().map((r, i) => (i === row.index ? { ...r, [field]: value } : r)));
  }
  function restore(row: ReviewedRow, field?: string) {
    receive(editor.restoreDefault({ table, key: row.key, index: row.index, field }), true);
  }
  function newCell(field: string, value: unknown) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (next.eu == null) return true;
    const ok = editRows([...activeRows(), next]);
    if (ok) setDraft(null);
    return ok;
  }
  function download() {
    const blob = new Blob(['\uFEFF' + runsCsv(editor.snapshot().data.vejdim_koersel_raekker)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'vejdim_koersler.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const basis = aktivt_beregningsgrundlag(session.data);
  const correlation = !isDiagram
    ? correlationRows(
        session.data.vejdim_koersel_raekker,
        basis.t_basis_table,
        basis.indstillinger.yderomraade,
      )
    : [];
  const resetName = isDiagram ? 'Nulstil dette diagram' : 'Nulstil kørsler';
  function reset() {
    receive(
      editor.edit(
        isDiagram
          ? { reset: 'designdiagrammer', diagram_nr: nr }
          : { reset: 'vejdim_koersel_raekker' },
      ),
      true,
    );
    setDraft(null);
  }
  const renderTable = () => (
    <>
      <div className={`table-wrap ${isDiagram ? 'diagram-scroll' : showAll ? '' : 'runs-scroll'}`}>
        <table
          className={`data-table ${isDiagram ? 'diagram-table' : 'runs-table'}`}
          aria-label={isDiagram ? `Diagram ${nr} data` : 'VejDim-kørsler'}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.field} title={c.help}>
                  {c.label}
                </th>
              ))}
              <th>
                <span className="sr-only">Handlinger</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const current = isDiagram
                ? row.current!
                : (enriched[row.index!] as Record<string, unknown>);
              const key = isDiagram
                ? `Diagram ${nr} · Eᵤ ${row.key}`
                : `${current.T} · Eᵤ ${current.eu}`;
              return (
                <tr key={`${nr}-${row.index}`}>
                  {columns.map((column) =>
                    column.locked ? (
                      <td
                        key={column.field}
                        className="locked-cell"
                        aria-label={`${column.label} · ${key}`}
                      >
                        {String(current[column.field] ?? '—')}
                      </td>
                    ) : (
                      <Cell
                        key={column.field}
                        column={column}
                        value={current[column.field]}
                        label={`${column.label} · ${key}`}
                        changed={row.changedFields.includes(column.field)}
                        standard={row.standard?.[column.field]}
                        commit={(v) => commit(row, column.field, v)}
                        restore={
                          row.standard && row.changedFields.includes(column.field)
                            ? () => restore(row, column.field)
                            : undefined
                        }
                        refresh={refresh}
                        emphasized={
                          isDiagram &&
                          !row.changedFields.includes(column.field) &&
                          readPoint(nr, Number(current.eu), column.field)
                        }
                      />
                    ),
                  )}
                  <td>
                    <div className="row-actions">
                      {row.kind === 'added' && <Badge variant="secondary">Ny</Badge>}
                      {row.kind === 'changed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Gendan række"
                          aria-label={`Gendan række · ${key}`}
                          onClick={() => restore(row)}
                        >
                          <RotateCcw />
                        </Button>
                      )}
                      {isDiagram && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Slet række"
                          aria-label={`Slet · ${key}`}
                          onClick={() => editRows(activeRows().filter((_, i) => i !== row.index))}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {draft && isDiagram && (
              <tr>
                {columns.map((column) => (
                  <Cell
                    key={column.field}
                    column={column}
                    value={draft[column.field]}
                    label={`${column.label} · Ny diagramrække`}
                    changed={false}
                    standard={null}
                    commit={(v) => newCell(column.field, v)}
                    refresh={refresh}
                  />
                ))}
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fjern tom diagramrække"
                    onClick={() => setDraft(null)}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="empty">
          {onlyChanged ? 'Ingen ændringer i denne tabel.' : 'Tabellen indeholder ingen rækker.'}
        </p>
      )}
      {all
        .filter((r) => r.kind === 'removed')
        .map((row) => (
          <div key={row.key} className="removed-row">
            <span>Eᵤ {row.key} · Fjernet fra standardtabellen</span>
            <Button variant="ghost" size="sm" onClick={() => restore(row)}>
              <RotateCcw />
              Gendan række
            </Button>
          </div>
        ))}
    </>
  );
  return (
    <main>
      <div className="breadcrumb">
        Grunddata / {isDiagram ? 'Designdiagrammer' : 'Trafikklasse-korrelation'}
      </div>
      <div className="page-heading">
        <div>
          <h1>{isDiagram ? 'Designdiagrammer' : 'Trafikklasse-korrelation'}</h1>
          <p className="intro">
            {isDiagram
              ? 'Diagrammer fra designmanualerne med tilhørende aflæste data. Tabellerne er bestemt ved lineær interpolation mellem kurvernes aflæste punkter, og beregningerne slår op direkte i dem.'
              : 'Vejledende kobling mellem Vejdirektoratets trafikklasser og designmanualernes Eₒ-kurver. Kørslerne kan redigeres — den ækvivalente Eₒ genberegnes og anvendes med det samme i dimensioneringen.'}
          </p>
        </div>
        <div className="save-state" role="status">
          {ctx.saveError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>
            {ctx.saveError ? 'Ikke gemt' : ctx.saved ? 'Gemt i denne browser' : 'Standarddata'}
          </span>
        </div>
      </div>
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
          <label className="filter">
            <input
              type="checkbox"
              checked={onlyChanged}
              onChange={(e) => setOnlyChanged(e.target.checked)}
            />
            Vis kun ændringer <Badge variant="secondary">{changed.length}</Badge>
          </label>
        </div>
        <Button variant="outline" size="sm" disabled={externalChange} onClick={reset}>
          <RotateCcw />
          {resetName}
        </Button>
      </div>
      {externalChange && (
        <div className="message warning" role="alert">
          Data er ændret i en anden fane.{' '}
          <Button onClick={() => location.reload()}>Genindlæs data</Button>
        </div>
      )}
      {ctx.errors.map((e) => (
        <div className="message error" role="alert" key={e}>
          {e}
        </div>
      ))}
      {ctx.saveError && (
        <div className="message error" role="alert">
          {ctx.saveError} Ændringerne er stadig i denne åbne fane.
          <Button
            disabled={externalChange}
            onClick={() => {
              const r = editor.retrySave();
              ctx.setSaved(r.ok);
              ctx.setSaveError(r.ok ? null : r.message);
            }}
          >
            Prøv at gemme igen
          </Button>
        </div>
      )}
      <fieldset disabled={externalChange} className="m-0 min-w-0 border-0 p-0">
        {isDiagram ? (
          <>
            <div className="diagram-selector">
              {session.data.designdiagrammer.map((d) => (
                <button
                  key={d.diagram_nr}
                  aria-label={`Vælg diagram ${d.diagram_nr}`}
                  aria-pressed={nr === d.diagram_nr}
                  onClick={() => {
                    setNr(d.diagram_nr);
                    ctx.remember({ diagram_nr: d.diagram_nr });
                    setDraft(null);
                    setOnlyChanged(false);
                  }}
                >
                  <span>DIAGRAM {d.diagram_nr}</span>
                  <strong>
                    {d.eo} <small>MN/m²</small>
                  </strong>
                  <span>Belastningsklasse {d.klasse}</span>
                </button>
              ))}
            </div>
            <section className="section-card">
              <div className="section-heading">
                <h2>
                  Diagram {nr} — Eₒ = {diagram.eo} MN/m², belastningsklasse {diagram.klasse}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!draft}
                  onClick={() =>
                    setDraft({ eu: null, t_uarmeret_cm: null, t_1_lag_cm: null, t_2_lag_cm: null })
                  }
                >
                  <Plus />
                  Tilføj række
                </Button>
              </div>
              <div className="diagram-layout">
                <div className="diagram-figures">
                  <h3>Optegnet af tabellens værdier</h3>
                  <RawChart diagram={diagram} />
                  <h3>Original scanning fra designmanualen</h3>
                  <a
                    href={`/diagrambilleder/${encodeURIComponent(diagram.image_name)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      alt={`Original scanning — diagram ${nr}`}
                      src={`/diagrambilleder/${encodeURIComponent(diagram.image_name)}`}
                    />
                  </a>
                </div>
                <div className="diagram-data">
                  {renderTable()}
                  <p className="table-caption">
                    Værdier med <strong>fed</strong> skrift er aflæst direkte i designdiagrammet; de
                    øvrige er bestemt ved lineær interpolation mellem de aflæste punkter. Tomme
                    felter angiver manglende diagramværdi. {diagramCoverage(diagram)}.
                  </p>
                </div>
              </div>
            </section>
            <Button
              variant="outline"
              onClick={() => {
                receive(editor.edit({ reset: 'designdiagrammer' }), true);
                setDraft(null);
              }}
            >
              Nulstil alle diagramdata til standard
            </Button>
          </>
        ) : (
          <>
            <section className="section-card">
              <div className="section-heading">
                <div>
                  <h2>VejDim-kørsler</h2>
                  <span className="section-meta">{enriched.length} kørsler · redigerbar</span>
                </div>
                <Button variant="outline" size="sm" onClick={download}>
                  <Download />
                  Hent som CSV
                </Button>
              </div>
              <p className="table-caption">
                Ubundet (SG + BL) og Samlet højde beregnes og kan ikke redigeres. Trafikklasse og Eᵤ
                bliver stående ved vandret scroll.
              </p>
              {renderTable()}
              <div className="section-heading">
                <span className="section-meta">
                  {showAll
                    ? 'Alle kørsler'
                    : `De første ${Math.min(9, rows.length)} kørsler i scrollområdet`}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Vis kun de første 9' : `Vis alle ${enriched.length}`}
                </Button>
              </div>
            </section>
            <section className="section-card">
              <div className="section-heading">
                <div>
                  <h2>Ækvivalent Eₒ — opslagstabellen</h2>
                  <span className="section-meta">
                    MPa · afledt af de aktive kørsler og diagrammer
                  </span>
                </div>
              </div>
              {ReadTable({ rows: correlation, label: 'Ækvivalent Eₒ' })}
              <p className="table-caption">{outsideRuleLine(basis.indstillinger.yderomraade)}</p>
              <p className="table-caption">
                <b>under / over</b> — uden for diagrammets kurver, beregningen afvises · <b>*</b> —
                inden for tolerancen; der regnes på randkurven · <b>†</b> — uden for tolerancen;
                reglerne i Indstillinger gælder · <b>(±x %)</b> — afvigelse fra randkurven ·{' '}
                <b>—</b> — manglende ustabiliseret kurve.
              </p>
              <CorrelationExample
                rows={session.data.vejdim_koersel_raekker}
                table={basis.t_basis_table}
              />
            </section>
            <div className="guidance-grid">
              <section className="section-card">
                <div className="section-heading">
                  <h2>Sådan er koblingen fremstillet</h2>
                </div>
                <ol className="guidance-steps">
                  {guidance.steps.map(([title, text]) => (
                    <li key={title}>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="section-card">
                <div className="section-heading">
                  <h2>Datagrundlag og forudsætninger</h2>
                </div>
                <p className="table-caption">
                  <b>{enriched.length} kørsler</b> = T1–T6 × Eᵤ {'{3, 4, 5, 10, 15, 20, 30, 40}'}{' '}
                  MPa, alle med:
                </p>
                <dl className="assumptions">
                  {guidance.assumptions.map(([title, text]) => (
                    <div key={title}>
                      <dt>{title}</dt>
                      <dd>{text}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
            <section className="section-card">
              <div className="section-heading">
                <h2>Fast asfaltpakke pr. klasse</h2>
              </div>
              {ReadTable({
                rows: asphaltRows(session.data.vejdim_koersel_raekker),
                label: 'Asfaltpakker',
              })}
              <p className="table-caption">
                Bundne bærelag er låst, hvor det er muligt; ellers er VejDims egne værdier anvendt,
                og tykkelsen varierer med Eᵤ. NÆ10 er dimensioneringstrafikken over 20 år.
              </p>
            </section>
          </>
        )}
      </fieldset>
      <footer className="page-footer">
        <span>Gyldige ændringer anvendes og gemmes automatisk.</span>
        <span>MSL Dimensionering · Grunddata</span>
      </footer>
    </main>
  );
}
