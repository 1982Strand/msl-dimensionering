import schema from '../engine/settings-ui.json';
import { standard_indstillinger } from '../engine/editing';
import { rund_op, er_oprundet } from '../engine/afrunding';
import { useEditor } from './EditorContext';
import { EditorFeedback, SaveState } from './EditorFeedback';
import { SettingField, type SettingDefinition, type SettingValue } from './SettingField';
import { Button } from '@/components/ui/button';
import { aktivt_beregningsgrundlag } from '../engine/auto-edit';
import { outsideDetails } from '../engine/settings-presentation';

type Field = SettingDefinition & { path: string[] };
type Section = {
  id: string | number;
  title: string;
  texts: string[];
  fields: Field[];
  minimumTable?: {
    min: number;
    max: number;
    step: number;
    columns: string[];
    resetLabel: string;
    rows?: { klasse: number; eo: number; belastning: string }[];
  };
};
const pageSchema = schema as unknown as { title: string; intro: string; sections: Section[] };
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
  const outside = outsideDetails(
    ctx.session.data.vejdim_koersel_raekker,
    aktivt_beregningsgrundlag(ctx.session.data).t_basis_table,
    settings.yderomraade,
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
  const rounded = rund_op(532, settings.afrunding.trin_mm);
  const roundingExample = er_oprundet(rounded, 532)
    ? `Eksempel: en beregnet lagtykkelse på 532 mm angives som ${rounded} mm${settings.afrunding.vis_eksakt ? ' (532 mm)' : ''}.`
    : 'Eksempel: en beregnet lagtykkelse på 532 mm angives uændret.';
  const roundedMinimums = Object.entries(lf.minimum_mm).filter(
    ([, mm]) =>
      settings.afrunding.trin_mm > 1 &&
      Math.abs(rund_op(mm, settings.afrunding.trin_mm) - mm) >= 0.5,
  );
  return (
    <main>
      <div className="breadcrumb">Indstillinger</div>
      <div className="page-heading">
        <div>
          <h1>{pageSchema.title}</h1>
          <p className="intro">{pageSchema.intro}</p>
        </div>
        <SaveState />
      </div>
      <div className="settings-start">
        <EditorFeedback />
      </div>
      <fieldset disabled={ctx.externalChange} className="m-0 min-w-0 border-0 p-0">
        {pageSchema.sections.map((section, index) => (
          <section
            className="section-card settings-card"
            key={section.id}
            aria-labelledby={`settings-${section.id}`}
          >
            <h2 id={`settings-${section.id}`}>
              {index + 1}. {section.title}
            </h2>
            {section.texts
              .filter((text) => !(index === 7 && text.startsWith('Afvigelsen fra randkurven')))
              .map((text, i) => (
                <p className="settings-prose" key={i}>
                  {plain(text)}
                </p>
              ))}
            <div className="settings-fields">
              {section.fields.map((field) => (
                <SettingField
                  key={field.key}
                  field={field}
                  value={valueAt(settings, field.path)}
                  refresh={ctx.refresh}
                  disabled={disabled(field.key)}
                  change={(value) => change(field.path, value)}
                />
              ))}
            </div>
            {index === 0 && <p className="settings-note">{roundingExample}</p>}
            {index === 5 && (
              <>
                {lf.standard_klassisk && (
                  <p className="info-banner">
                    <b>Klassisk standardberegning er valgt.</b> Minimumstykkelsen i afsnit 3,
                    reglerne for underliggende lag i afsnit 4 og placeringen af geonet i afsnit 7
                    gælder ikke Standard. De gælder fortsat Brugerdefineret. Reglerne for
                    trafikklasser uden for diagrammet i afsnit 8 gælder begge tilstande.
                  </p>
                )}
                <details className="settings-deviations">
                  <summary>Eksempel</summary>
                  <p>
                    Belastningsklasse 4, Eᵤ = 33 MPa, 1 lag referencenet. Designdiagrammet giver 343
                    mm uden geonet og 200 mm med 1 lag geonet. Oprundet til 50 mm bliver tykkelserne
                    350 mm og 200 mm. Stabilgrusminimum er 250 mm.
                  </p>
                  <p>
                    Er fluebenet for samlet minimum i afsnit 3 sat, øges opbygningen med geonet til
                    250 mm stabilgrus, og reduktionen er 100 mm. Er fluebenet fjernet, er
                    opbygningen med geonet 200 mm, altså tyndere end stabilgrusminimum:
                  </p>
                  <div className="table-wrap">
                    <table className="summary-table" aria-label="Eksempel på stabilgrusminimum">
                      <thead>
                        <tr>
                          <th>Valg</th>
                          <th>Opbygning med 1 lag geonet</th>
                          <th>Reduktion</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Hele tykkelsen vises som stabilgrus</td>
                          <td>200 mm stabilgrus</td>
                          <td>150 mm</td>
                        </tr>
                        <tr>
                          <td>Tykkelsen øges til stabilgrusminimum</td>
                          <td>250 mm stabilgrus</td>
                          <td>100 mm</td>
                        </tr>
                        <tr>
                          <td>Ét samlet ubundet lag</td>
                          <td>200 mm ubunden opbygning</td>
                          <td>150 mm</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p>
                    Den ustabiliserede opbygning er i alle tilfælde 350 mm, fordelt med 250 mm
                    stabilgrus og 100 mm bundsikring.
                  </p>
                </details>
              </>
            )}
            {index === 7 && (
              <>
                <div className="settings-fields settings-note">
                  <div>
                    <b>Over diagrammet</b>
                    <p>{outside.captions[0]}</p>
                    <p>{outside.captions[1]}</p>
                  </div>
                  <div>
                    <b>Under diagrammet</b>
                    <p>{outside.captions[2]}</p>
                    <p>{outside.captions[3]}</p>
                  </div>
                </div>
                <details className="settings-deviations">
                  <summary>Målte afvigelser i korrelationen</summary>
                  <p>
                    Afvigelsen fra randkurven i procent af randkurvens tykkelse for de kørte punkter
                    uden for diagrammets kurver, + over den øverste kurve og − under den laveste, og
                    den håndtering, de gældende regler giver: * = inden for tolerancen, † = uden for
                    tolerancen, med advarsel. Tomme celler ligger inden for kurverne.
                  </p>
                  <div className="table-wrap">
                    <table className="summary-table" aria-label="Målte afvigelser">
                      <thead>
                        <tr>
                          <th>Trafikklasse</th>
                          {Object.keys(Object.values(outside.cells)[0]).map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(outside.cells).map(([t, row]) => (
                          <tr key={t}>
                            <td>{t}</td>
                            {Object.entries(row).map(([k, v]) => (
                              <td key={k}>{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
            {section.minimumTable && (
              <div className="settings-minimums">
                <h3>Minimumstykkelse pr. belastningsklasse</h3>
                <div className="table-wrap">
                  <table className="summary-table minimum-table" aria-label="Minimumstykkelser">
                    <thead>
                      <tr>
                        {section.minimumTable.columns.map((label) => (
                          <th key={label}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.minimumTable.rows!.map((row) => (
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
                                min: section.minimumTable!.min,
                                max: section.minimumTable!.max,
                                step: section.minimumTable!.step,
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
                  {section.minimumTable.resetLabel}
                </Button>
                {roundedMinimums.length > 0 && (
                  <p className="warning-banner" role="status">
                    <b>
                      Minimumstykkelser, der ikke går op i oprundingstrinnet på{' '}
                      {settings.afrunding.trin_mm} mm.
                    </b>{' '}
                    De oprundes til trinnet ved beregningen:{' '}
                    {roundedMinimums
                      .map(
                        ([klasse, mm]) =>
                          `klasse ${klasse}: ${mm} mm anvendes som ${rund_op(mm, settings.afrunding.trin_mm)} mm`,
                      )
                      .join(', ')}
                    . Tabellen kan tilpasses trinnet, eller trinnet kan ændres i afsnit 1.
                  </p>
                )}
              </div>
            )}
          </section>
        ))}
      </fieldset>
      <footer className="page-footer">
        <span>Gyldige ændringer gemmes automatisk i denne browser.</span>
        <span>MSL Dimensionering</span>
      </footer>
    </main>
  );
}
