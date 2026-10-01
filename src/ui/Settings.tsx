import { type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { standard_indstillinger } from '../engine/editing';
import { useEditor } from './EditorContext';
import { EditorFeedback, SaveState } from './EditorFeedback';
import { SettingField, type SettingValue } from './SettingField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { aktivt_beregningsgrundlag } from '../engine/auto-edit';
import {
  outsideDetails,
  settingsPage,
  type SettingsPageItem,
} from '../engine/settings-presentation';
import { Notice } from './Notice';
import { PageFooter, PageHeader } from './page';
import './Settings.css';

function valueAt(value: unknown, path: string[]): SettingValue {
  for (const key of path) value = (value as Record<string, unknown>)[key];
  return value as SettingValue;
}
function plain(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replaceAll('\\*', '*');
}

export function Settings() {
  const ctx = useEditor();
  const settings = ctx.session.data.indstillinger;
  const lf = settings.lagfordeling;
  const model = settingsPage(
    settings,
    outsideDetails(
      ctx.session.data.vejdim_koersel_raekker,
      aktivt_beregningsgrundlag(ctx.session.data).t_basis_table,
      settings.yderomraade,
    ),
  );
  function change(path: string[], value: SettingValue) {
    if (ctx.externalChange) return;
    const next = structuredClone(ctx.editor.snapshot().data.indstillinger);
    let node = next as unknown as Record<string, unknown>;
    for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
    node[path.at(-1)!] = value;
    ctx.receive(ctx.editor.edit({ section: 'indstillinger', value: next }), true);
  }
  function disabled(key: string) {
    if (key === 'ind_lf_restlag_graense') return lf.restlag !== 'flet';
    if (['ind_lf_vd_baerelag', 'ind_lf_vd_bundsikring', 'ind_lf_kraev_bundsikring'].includes(key))
      return lf.restlag !== 'vd';
    if (key === 'ind_std_opdeling') return lf.standard_klassisk;
    if (key === 'ind_std_under_minimum')
      return lf.standard_klassisk || !lf.standard_opdeling || lf.samlet_minimum;
    return false;
  }
  function renderItem(item: SettingsPageItem, index: number): ReactNode {
    switch (item.kind) {
      case 'field':
        return (
          <SettingField
            key={item.field.key}
            field={item.field}
            value={valueAt(settings, item.field.path)}
            refresh={ctx.refresh}
            disabled={disabled(item.field.key)}
            change={(value) => change(item.field.path, value)}
          />
        );
      case 'columns':
        return (
          <div
            className="settings-fields"
            key={index}
            style={{ '--settings-columns': item.columns.length } as React.CSSProperties}
          >
            {item.columns.map((column, i) => (
              <div key={i}>{column.map(renderItem)}</div>
            ))}
          </div>
        );
      case 'prose':
        return (
          <p className="settings-prose" key={index}>
            {plain(item.text)}
          </p>
        );
      case 'caption':
        // »Gælder …« er et mærke; øvrige forklaringer er infobeskeder (B-058).
        return item.text.startsWith('Gælder') ? (
          <Badge variant="outline" className="applies-badge" data-settings-caption key={index}>
            {plain(item.text)}
          </Badge>
        ) : (
          <Notice data-settings-caption key={index}>
            {plain(item.text)}
          </Notice>
        );
      case 'info':
      case 'warning': {
        const split = item.text.indexOf('. ') + 1;
        return (
          <Notice
            kind={item.kind}
            role={item.kind === 'warning' ? 'status' : undefined}
            title={item.text.slice(0, split)}
            key={index}
          >
            {item.text.slice(split)}
          </Notice>
        );
      }
      case 'minimumTable':
        return (
          <div key={index}>
            <div className="settings-minimums">
              <h3>Minimumstykkelse pr. belastningsklasse</h3>
              <div className="table-wrap">
                <table
                  className="data-table summary-table minimum-table"
                  aria-label="Minimumstykkelser"
                >
                  <thead>
                    <tr>
                      {item.table.columns.map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item.table.rows.map((row) => (
                      <tr key={row.klasse}>
                        <td>{row.klasse}</td>
                        <td>{row.eo}</td>
                        <td>{row.belastning}</td>
                        <td>
                          <SettingField
                            field={{
                              key: `minimum-${row.klasse}`,
                              label: `Belastningsklasse ${row.klasse} (mm)`,
                              kind: 'number',
                              min: item.table.min,
                              max: item.table.max,
                              step: item.table.step,
                            }}
                            value={lf.minimum_mm[row.klasse]}
                            refresh={ctx.refresh}
                            change={(value) =>
                              change(['lagfordeling', 'minimum_mm', String(row.klasse)], value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = structuredClone(ctx.editor.snapshot().data.indstillinger);
                  next.lagfordeling.minimum_mm = standard_indstillinger().lagfordeling.minimum_mm;
                  ctx.receive(ctx.editor.edit({ section: 'indstillinger', value: next }), true);
                }}
              >
                {item.table.resetLabel}
              </Button>
            </div>
          </div>
        );
      case 'example':
        return (
          <details className="settings-deviations" key={index}>
            <summary>{item.label}</summary>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="table-wrap">
                    <table
                      className="data-table summary-table"
                      aria-label="Eksempel på stabilgrusminimum"
                    >
                      {children}
                    </table>
                  </div>
                ),
              }}
            >
              {item.text}
            </ReactMarkdown>
          </details>
        );
      case 'deviations':
        return (
          <details className="settings-deviations" key={index}>
            <summary>{item.label}</summary>
            <p>{plain(item.text)}</p>
            <div className="table-wrap">
              <table className="data-table summary-table" aria-label="Målte afvigelser">
                <thead>
                  <tr>
                    <th>Trafikklasse</th>
                    {Object.keys(Object.values(item.cells)[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(item.cells).map(([traffic, row]) => (
                    <tr key={traffic}>
                      <td>{traffic}</td>
                      {Object.entries(row).map(([key, value]) => (
                        <td key={key}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
    }
  }
  return (
    <main className="settings-page">
      <PageHeader
        page="indstillinger"
        title={model.title}
        intro={model.intro}
        aside={<SaveState />}
      />
      <div className="settings-start">
        <EditorFeedback />
      </div>
      <fieldset disabled={ctx.externalChange} className="m-0 min-w-0 border-0 p-0">
        {model.sections.map((section) => (
          <section
            className="section-card settings-card"
            key={section.id}
            aria-labelledby={`settings-${section.id}`}
          >
            <div className="bg-trin-hoved">
              <h2 id={`settings-${section.id}`}>
                <span className="bg-trin-nr">{section.number}</span>
                <span className="bg-trin-titel">{section.title}</span>
              </h2>
              <span className="bg-trin-opsum" data-settings-summary>
                {section.summary}
              </span>
            </div>
            {section.content.map(renderItem)}
          </section>
        ))}
      </fieldset>
      <PageFooter>Gyldige ændringer gemmes automatisk i denne browser.</PageFooter>
    </main>
  );
}
