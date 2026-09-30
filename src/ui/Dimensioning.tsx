import { useEffect, useMemo } from 'react';
import { useEditor } from './EditorContext';
import { EditorFeedback, SaveState } from './EditorFeedback';
import { SettingField, type SettingDefinition, type SettingValue } from './SettingField';
import { Button } from '@/components/ui/button';
import {
  dimensioningValues,
  dimensioningInput,
  resetDimensioning,
  MANUAL_MATERIAL,
} from '../engine/dimensioning-form';
import {
  dimensioner,
  beregn_grundlag,
  geonet_valgliste,
  phi_fra_materialer,
} from '../engine/dimensionering';
import { beregn_alle_produkter } from '../engine/products';
import { valider_input } from '../engine/validators';
import { defaults, PHI_BASIS } from '../engine/data';
import schema from '../engine/dimensioning-ui.json';
import { laengde } from '../engine/enhed';
import { pythonFixed, pythonRound } from '../engine/python-numbers';
import { er_oprundet } from '../engine/afrunding';
import type { CalculationResult } from '../engine/types';
import { InfoPopup } from './InfoPopup';
import { ConstructionFigure } from './ConstructionFigure';
import { PersonalDiagram } from './PersonalDiagram';
import { PhiSummary } from './PhiSummary';
import { CouplingExplanation } from './CouplingExplanation';
import { productOverview, overviewColumns, type OverviewSort } from '../engine/product-overview';

const dk = (n: number, digits = 1) => pythonFixed(n, digits).replace('.', ',');
function productLabel(name: string) {
  return (
    schema.fields.find((f) => f.key === 'std_geonet')?.options?.find((o) => o.value === name)
      ?.label ?? name
  );
}

export function Dimensioning() {
  const ctx = useEditor();
  const values = dimensioningValues(ctx.session.values, ctx.session.data);
  const input = useMemo(
    () => dimensioningInput(ctx.session.values, ctx.session.data),
    [ctx.session],
  );
  const basis = useMemo(() => beregn_grundlag(input), [input]);
  const result = useMemo(() => dimensioner(input), [input]);
  const standard = input.tilstand === 'Standard',
    prefix = standard ? 'std' : 'bd';
  const unit = ctx.session.data.indstillinger.opbygning.enhed;
  const products = useMemo(() => {
    if (!result) return { one: [], two: [] };
    const common = {
      eu: input.eu,
      eo: result.eo!,
      phi: result.phi,
      afrunding: result.afrunding,
      skala: result.skala,
      t_basis_table: input.t_basis_table,
      klasse_for_anbefaling: result.valgt_klasse,
    };
    return {
      one: beregn_alle_produkter({ ...common, lag_mode: '1_lag' }),
      two: beregn_alle_produkter({ ...common, lag_mode: '2_lag' }),
    };
  }, [input, result]);
  const options = geonet_valgliste(
    [...products.one, ...products.two]
      .filter((p) => p.fejl === null && p.t_armeret_mm != null)
      .map((p) => p.navn),
  ).valg;
  if (result && !options.length) options.push(result.geonet_navn);
  const sortKey = `rt_sort_${standard ? 'standard' : 'brugerdefineret'}`;
  const rawSort = ctx.session.values[sortKey];
  const sort =
    rawSort &&
    typeof rawSort === 'object' &&
    !Array.isArray(rawSort) &&
    overviewColumns.some((c) => c.key === rawSort.column) &&
    ['asc', 'desc'].includes(String(rawSort.direction))
      ? (rawSort as unknown as OverviewSort)
      : null;
  const overview = productOverview({
    ...products,
    unit,
    rounding: ctx.session.data.indstillinger.afrunding,
    trafficEu: basis.type === 'trafikklasse' ? input.eu : null,
    runs: input.koersler,
    table: input.t_basis_table,
    rules: input.indstillinger?.yderomraade,
    sort,
  });
  // Mirror the original fallback when an input change invalidates a selected product.
  useEffect(() => {
    if (
      !ctx.externalChange &&
      result &&
      ctx.session.values[`${prefix}_geonet`] !== result.geonet_navn
    )
      ctx.remember({ [`${prefix}_geonet`]: result.geonet_navn });
  }, [result?.geonet_navn, prefix, ctx.externalChange]);
  useEffect(() => {
    if (standard || basis.eo === null || ctx.externalChange) return;
    const normalized: Record<string, SettingValue> = {};
    for (let i = 0; i < Number(values.bd_antal_lag); i++) {
      for (const key of [`bd_mat_${i}`, `bd_t_${i}`])
        if (ctx.session.values[key] != null && ctx.session.values[key] !== values[key])
          normalized[key] = values[key] as SettingValue;
    }
    if (Object.keys(normalized).length) ctx.remember(normalized);
  }, [ctx.session, standard, basis.eo, ctx.externalChange]);
  function change(key: string, value: SettingValue) {
    const updates: Record<string, SettingValue> = { [key]: value };
    if (key === 'bd_phi_override' && value && ctx.session.values.bd_phi_man == null)
      updates.bd_phi_man = pythonRound(phi_fra_materialer(input.materialer ?? []), 1);
    ctx.remember(updates);
  }
  const field = (definition: SettingDefinition) => (
    <SettingField
      key={definition.key}
      field={{
        ...definition,
        help: schema.fields.find((f) => f.key === definition.key)?.help?.replace(/\*\*/g, ''),
      }}
      value={values[definition.key] as SettingValue}
      refresh={ctx.refresh}
      change={(value) => change(definition.key, value)}
    />
  );
  const choice = (
    key: string,
    label: string,
    options: SettingValue[],
    kind: 'radio' | 'select' = 'radio',
  ) =>
    field({
      key,
      label,
      kind,
      inline: key.endsWith('_valgt_klasse') || key.endsWith('_valgt_tklasse'),
      options: options.map((value) => ({ value, label: String(value) })),
    });
  function slider(
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    help: string,
  ) {
    return (
      <div className="setting-field dim-slider">
        <label htmlFor={key}>
          {label}: <output>{String(values[key])}</output>
        </label>
        <input
          id={key}
          type="range"
          min={min}
          max={max}
          step={step}
          value={Number(values[key])}
          onChange={(e) => change(key, Number(e.target.value))}
        />
        <p>{help}</p>
      </div>
    );
  }
  const checks = result
    ? ['1_lag', '2_lag'].map((mode, i) => {
        const r = (i === 0 ? result.res_1 : result.res_2) as CalculationResult;
        return valider_input({
          eu: result.eu,
          eo: result.eo!,
          phi: result.phi,
          lag_mode: mode,
          geonet: result.geonet,
          materialer: result.materialer,
          t_armeret_mm: r.t_armeret_mm,
          t_basis_table: input.t_basis_table,
          tillad_interpoleret_eo: basis.type === 'trafikklasse',
        });
      })
    : [];
  const messages = (key: 'fejl' | 'advarsler' | 'anbefalinger') => [
    ...new Set(checks.flatMap((v) => v[key])),
  ];
  const weighted = phi_fra_materialer(input.materialer ?? []);
  const count = Number(values.bd_antal_lag);
  return (
    <main>
      <div className="breadcrumb">Dimensionering</div>
      <div className="page-heading">
        <div>
          <h1>Dimensionering</h1>
          <p className="intro">
            Bærelagstykkelse med og uden geonetarmering. Grundlaget er BG Byggros' designmanualer
            til Tensar og GS-GRID samt interne forsøgsdata.
          </p>
        </div>
        <SaveState />
      </div>
      <div className="settings-start">
        <EditorFeedback />
      </div>
      <fieldset disabled={ctx.externalChange} className="m-0 min-w-0 border-0 p-0">
        <div className="dim-mode">
          {choice('tilstand', 'Tilstand', ['Standard', 'Brugerdefineret'])}
          <Button
            variant="outline"
            onClick={() => {
              const next = resetDimensioning(ctx.editor.snapshot().values);
              const saved = ctx.editor.setValues(next);
              ctx.receive(
                { errors: [], state: ctx.session.data, persistence: null, changed: true, saved },
                true,
              );
            }}
          >
            Nulstil dimensionering
          </Button>
        </div>
        <section className="section-card settings-card">
          <h2>1. Underbund og dimensioneringsgrundlag</h2>
          <div className="dim-input-grid">
            <div>
              {choice(`${prefix}_eu_mode`, 'Input-form', ['Eᵤ — E-modul', 'Cv — vingestyrke'])}
              {String(values[`${prefix}_eu_mode`]).startsWith('Cv') ? (
                <>
                  {slider(
                    `${prefix}_cv_slider`,
                    'Cv (kN/m²)',
                    0,
                    180,
                    5,
                    'Ukorrigeret vingerstyrke fra feltmåling/markjournal.',
                  )}
                  <p className="settings-note">
                    Cv = {String(values[`${prefix}_cv_slider`])} kN/m² → Eᵤ = {input.eu} MPa
                  </p>
                  <InfoPopup label="Se korrelationstabel" title="Korrelation mellem Cv og Eᵤ">
                    <table className="summary-table">
                      <thead>
                        <tr>
                          <th>Cv (kN/m²)</th>
                          <th>Eᵤ (MPa)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defaults.CV_TIL_EU.map(([min, max, eu]) => (
                          <tr key={min}>
                            <td>
                              {min}–{max}
                            </td>
                            <td>{eu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </InfoPopup>
                </>
              ) : (
                slider(
                  `${prefix}_eu_slider`,
                  'Eᵤ (MPa)',
                  defaults.EU_MIN,
                  defaults.EU_MAX,
                  1,
                  'Angiv E-modul for underbunden. Oftest målt ved belastningsforsøg i marken, eller skønnet.',
                )
              )}
            </div>
            <div>
              {choice(`${prefix}_grundlag`, 'Dimensioneringsgrundlag', [
                'Belastningsklasse',
                'Trafikklasse',
              ])}
              {basis.type === 'trafikklasse'
                ? choice(
                    `${prefix}_valgt_tklasse`,
                    'Trafikklasse',
                    Object.keys(defaults.TRAFIKKLASSER),
                  )
                : choice(`${prefix}_valgt_klasse`, 'Belastningsklasse', [1, 2, 3, 4, 5, 6])}
              {basis.type === 'belastningsklasse' && (
                <InfoPopup
                  label="Se designdiagram"
                  title={`Designdiagram · belastningsklasse ${basis.valgt_klasse}`}
                  wide
                >
                  <img
                    className="dim-scan"
                    src={`/diagrambilleder/${ctx.session.data.designdiagrammer.find((d) => d.klasse === basis.valgt_klasse)?.image_name}`}
                    alt={`Designdiagram for belastningsklasse ${basis.valgt_klasse}`}
                  />
                </InfoPopup>
              )}
              {basis.type === 'trafikklasse' && (
                <a className="dim-link" href="#vejdim">
                  Se korrelationstabel
                </a>
              )}
            </div>
            <dl className="dim-keyfigures">
              <dt>Eᵤ</dt>
              <dd>{input.eu} MPa</dd>
              <dt>{basis.type === 'trafikklasse' ? 'Eₒ,ækv' : 'Eₒ'}</dt>
              <dd>{basis.eo === null ? '—' : dk(basis.eo)} MPa</dd>
              <dt>Grundlag</dt>
              <dd>{basis.t_klasse ?? `Belastningsklasse ${basis.valgt_klasse}`}</dd>
            </dl>
          </div>
          {basis.yder && (
            <p
              className={
                basis.eo === null || !basis.yder.inden_tolerance ? 'warning-banner' : 'info-banner'
              }
            >
              {basis.t_klasse} · Eᵤ = {input.eu} MPa ligger {dk(Number(basis.yder.afvigelse_pct))} %{' '}
              {basis.zone === 'over'
                ? 'over diagrammets øverste kurve'
                : 'under diagrammets laveste kurve'}
              , {basis.yder.inden_tolerance ? 'inden for' : 'uden for'} tolerancen på{' '}
              {dk(Number(basis.yder.tolerance_pct))} %. VejDim kræver{' '}
              {laengde(Number(basis.yder.t_vejdim_mm), unit)} ubundet mod{' '}
              {laengde(Number(basis.yder.t_rand_mm), unit)} for kurven Eₒ ={' '}
              {String(basis.yder.eo_rand)} MPa.{' '}
              {basis.eo === null
                ? 'Beregningen afvises efter Indstillinger, afsnit 8, og opbygningen kræver en konkret vurdering. Der kan i stedet dimensioneres efter Belastningsklasse-grundlaget, eller reglerne kan ændres under Indstillinger.'
                : basis.yder.handling === 'laveste'
                  ? 'Der regnes med diagrammets laveste kurve.'
                  : 'Der regnes med VejDims tykkelse; reduktionen aflæses på randkurven.'}
            </p>
          )}
          {basis.eo === null && !basis.yder && (
            <p className="warning-banner">
              Eᵤ = {input.eu} MPa er uden for de kørte punkter for {basis.t_klasse}. Vælg et Eᵤ i
              intervallet, udfyld kørslen under Trafikklasse-korrelation, eller brug
              Belastningsklasse-grundlaget.
            </p>
          )}
        </section>
        {(standard || basis.eo !== null) && (
          <section className="section-card settings-card">
            <h2>2. {standard ? 'Forudsætninger' : 'Opbygning'}</h2>
            {standard ? (
              <p className="settings-prose">
                I standardberegningen regnes med designdiagrammernes referencemateriale, φᵥ ={' '}
                {PHI_BASIS}°. Der kan derfor ikke vælges forskellige materialelag. Reduktion i
                bærelagstykkelser korrigeres for de forskellige geonets effektindeks, som er
                virkningsgraden set i forhold til referencenettene, med indeks 100.{' '}
                {ctx.session.data.indstillinger.lagfordeling.standard_klassisk
                  ? 'Der regnes med klassisk standardberegning: opbygningen vises som ét samlet bærelag uden minimumstykkelse, jf. Indstillinger, afsnit 6.'
                  : ctx.session.data.indstillinger.lagfordeling.standard_opdeling
                    ? 'Opbygningen vises som stabilgrus og bundsikring, hvor stabilgruset er minimumstykkelsen for klassen, jf. Indstillinger, afsnit 6.'
                    : 'Opbygningen vises som ét samlet bærelag.'}
              </p>
            ) : (
              <>
                <div className="phi-input-layout">
                  <div>
                    {field({
                      key: 'bd_antal_lag',
                      integer: true,
                      label: 'Antal lag',
                      kind: 'number',
                      min: 1,
                      max: 3,
                      step: 1,
                    })}
                    <div className="dim-layers">
                      {Array.from({ length: count }, (_, i) => {
                        const material = input.materialer![i];
                        const deleted =
                          ctx.session.values[`bd_mat_${i}`] &&
                          ctx.session.values[`bd_mat_${i}`] !== values[`bd_mat_${i}`];
                        return (
                          <div className="dim-layer" key={i}>
                            <h3>
                              {count === 2
                                ? ['Øverste lag', 'Nederste lag'][i]
                                : count === 3
                                  ? ['Øverste lag', 'Midterste lag', 'Nederste lag'][i]
                                  : 'Lag 1'}
                            </h3>
                            <div className="settings-fields">
                              {choice(
                                `bd_mat_${i}`,
                                `Materiale · lag ${i + 1}`,
                                [
                                  ...ctx.session.data.materialer.map((m) => m.navn),
                                  MANUAL_MATERIAL,
                                ],
                                'select',
                              )}
                              {field({
                                key: `bd_t_${i}`,
                                label: `Tykkelse (mm) · lag ${i + 1}`,
                                kind: 'number',
                                min: 200,
                                max: 2000,
                                step: 50,
                              })}
                            </div>
                            {material.navn === MANUAL_MATERIAL ? (
                              <div className="dim-manual-fields">
                                {field({
                                  key: `bd_phi_m_${i}`,
                                  label: `φᵢ (°) · lag ${i + 1}`,
                                  kind: 'number',
                                  min: 20,
                                  max: 60,
                                  step: 0.5,
                                })}
                                {field({
                                  integer: true,
                                  key: `bd_korn_m_${i}`,
                                  label: `Max kornstørrelse (mm) · lag ${i + 1}`,
                                  kind: 'number',
                                  min: 0,
                                  max: 500,
                                  step: 1,
                                })}
                                {choice(
                                  `bd_lt_m_${i}`,
                                  `Lagtype · lag ${i + 1}`,
                                  ['Bærelag', 'Bundsikring'],
                                  'select',
                                )}
                              </div>
                            ) : (
                              <p className="settings-note">
                                φᵢ = {dk(material.phi)}° · {String(material.lagtype)} · maks. korn{' '}
                                {String(material.max_korn)} mm
                                {material.krav_maskestoerrelse_mm != null
                                  ? ` · krav til geonet maskestørrelse ${material.krav_maskestoerrelse_mm} mm`
                                  : ''}
                              </p>
                            )}
                            {deleted && (
                              <p className="warning-banner">
                                Materialet '{String(ctx.session.values[`bd_mat_${i}`])}' findes ikke
                                længere i databasen. Laget er skiftet til manuel indtastning.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="settings-note">
                      Samlet:{' '}
                      {laengde(
                        input.materialer!.reduce((sum, m) => sum + (m.tykkelse_mm ?? 0), 0),
                        unit,
                      )}{' '}
                      · vægtet φᵥ = {dk(weighted, 2)}°. Mindste lagtykkelse der kan indtastes er 200
                      mm.
                    </p>
                    {field({
                      key: 'bd_phi_override',
                      label: 'Overskriv φᵥ manuelt',
                      kind: 'checkbox',
                    })}
                    {values.bd_phi_override && (
                      <>
                        {field({
                          key: 'bd_phi_man',
                          label: 'φᵥ (°)',
                          kind: 'number',
                          min: 20,
                          max: 60,
                          step: 0.5,
                        })}
                        <p className="warning-banner">
                          Den manuelt indtastede værdi anvendes i stedet for den vægtede.
                          Opmærksomheden henledes på, at værdien ikke længere følger ændringer i
                          materialelagene.
                        </p>
                      </>
                    )}
                  </div>
                  <PhiSummary input={input} />
                </div>
              </>
            )}
          </section>
        )}
        {result ? (
          <section className="section-card settings-card">
            <h2>Resultater</h2>
            {field({
              key: `${prefix}_geonet`,
              label: 'Produkt',
              kind: 'select',
              options: options.map((value) => ({ value, label: productLabel(value) })),
            })}
            {result.geonet?.korrektion_interval && (
              <p className="settings-note">
                Produktet har et korrektionsinterval. De viste tykkelser er konservative; den
                optimale tykkelse markeres med en grøn prikket linje i opbygningsfiguren.
              </p>
            )}
            <div className="dim-results" aria-label="Beregnet bærelagstykkelse">
              <div>
                <h3>Uden geonet</h3>
                <strong>
                  {laengde(
                    (result.res_1 as CalculationResult).t_uarmeret_phi_kor_mm ??
                      (result.res_2 as CalculationResult).t_uarmeret_phi_kor_mm ??
                      result.t_uarmeret_mm,
                    unit,
                  )}
                </strong>
              </div>
              {([result.res_1, result.res_2] as CalculationResult[]).map((r, i) => (
                <div key={i}>
                  <h3>{i + 1} lag geonet</h3>
                  <strong>{laengde(r.t_armeret_mm ?? null, unit)}</strong>
                  {ctx.session.data.indstillinger.afrunding.vis_eksakt &&
                    er_oprundet(r.t_armeret_mm ?? null, r.t_armeret_eksakt_mm ?? null) && (
                      <p>beregnet {laengde(r.t_armeret_eksakt_mm ?? null, unit)}</p>
                    )}
                  <p>
                    {r.fejl ??
                      `Reduktion: ${laengde(r.reduktion_mm ?? null, unit)} (${r.reduktion_pct == null ? '—' : dk(r.reduktion_pct * 100, 0)} %)`}
                  </p>
                </div>
              ))}
            </div>
            {(['fejl', 'advarsler', 'anbefalinger'] as const).flatMap((key) =>
              messages(key).map((message) => (
                <p
                  className={key === 'anbefalinger' ? 'info-banner' : 'warning-banner'}
                  key={message}
                >
                  {message}
                </p>
              )),
            )}
            <details className="settings-deviations">
              <summary>Alle produkter</summary>
              <div className="table-wrap">
                <table className="summary-table product-overview" aria-label="Alle produkter">
                  <thead>
                    <tr>
                      {overviewColumns.map((c) => (
                        <th
                          key={c.key}
                          aria-sort={
                            sort?.column === c.key
                              ? sort.direction === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          <button
                            type="button"
                            title={
                              c.key === 'klasse' && basis.type === 'trafikklasse'
                                ? `Viser anbefalede trafikklasser ved Eᵤ = ${dk(input.eu, 0)} MPa. Oversættelsen gælder kun dette Eᵤ — samme trafikklasse rammer forskellige belastningsklasser ved en anden underbund.`
                                : undefined
                            }
                            aria-label={`Sorter efter ${c.key === 'sparet1' ? 'sparet med 1 lag' : c.key === 'sparet2' ? 'sparet med 2 lag' : c.label}`}
                            onClick={() =>
                              ctx.remember({
                                [sortKey]: {
                                  column: c.key,
                                  direction:
                                    sort?.column === c.key
                                      ? sort.direction === 'asc'
                                        ? 'desc'
                                        : 'asc'
                                      : c.direction,
                                },
                              })
                            }
                          >
                            {c.label}
                            {sort?.column === c.key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.rows.map((row) => (
                      <tr
                        key={row.name}
                        className={row.name === result.geonet_navn ? 'dim-selected' : ''}
                      >
                        {row.cells.map((cell, i) => (
                          <td key={i}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="product-overview-caption">{overview.caption}</p>
            </details>
          </section>
        ) : (
          basis.eo !== null && (
            <p className="warning-banner">Ingen gyldig dimensionering for denne kombination.</p>
          )
        )}
        {result && (
          <ConstructionFigure
            result={result}
            products={products}
            display={ctx.session.data.indstillinger.opbygning}
            netplacering={ctx.session.data.indstillinger.lagfordeling.netplacering}
          />
        )}
        {result && (
          <PersonalDiagram
            result={result}
            products={products}
            table={input.t_basis_table}
            showInput={ctx.session.values.bd_dd_vis_din_prik !== false}
            showEndpoints={ctx.session.values.bd_dd_vis_lag_prikker !== false}
            onChange={(key, value) => ctx.remember({ [key]: value })}
          />
        )}
        {result && <CouplingExplanation input={input} result={result} />}
      </fieldset>
      <footer className="page-footer">
        <span>Udkast · fulde mellemregninger og rapport tilføjes senere.</span>
        <span>MSL Dimensionering</span>
      </footer>
    </main>
  );
}
