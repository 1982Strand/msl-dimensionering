import { useEffect, useMemo, useState } from 'react';
import { useEditor } from './EditorContext';
import { EditorFeedback, SaveState } from './EditorFeedback';
import { SettingField, type SettingDefinition, type SettingValue } from './SettingField';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LineChart, RotateCcw, Table as TableIcon } from 'lucide-react';
import { Notice } from './Notice';
import { PageFooter, PageHeader } from './page';
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
import { defaults } from '../engine/data';
import schema from '../engine/dimensioning-ui.json';
import { laengde } from '../engine/enhed';
import { pythonFixed, pythonRound } from '../engine/python-numbers';
import { dimensioningPage, pageIntroduction } from '../engine/dimensioning-page';
import { PageContent, PageResultCards } from './DimensioningPageContent';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import './dimensioning-page.css';
import './expander-card.css';
import { InfoPopup } from './InfoPopup';
import { TrafficCorrelationPopup } from './TrafficCorrelationPopup';
import { ConstructionFigure } from './ConstructionFigure';
import { PersonalDiagram } from './PersonalDiagram';
import { NetDetails, NetIntervalNote } from './NetDetails';
import { PhiSummary } from './PhiSummary';
import { CouplingExplanation } from './CouplingExplanation';
import { ResultChecks, ResultStatus } from './ResultChecks';
import { productOverview, overviewColumns, type OverviewSort } from '../engine/product-overview';
import { productPicker } from '../engine/product-picker';
import { ProductPicker } from './ProductPicker';

const dk = (n: number, digits = 1) => pythonFixed(n, digits).replace('.', ',');

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
  const page = useMemo(() => dimensioningPage(input, result, products), [input, result, products]);
  const content = (slot: string) => <PageContent model={page} slot={slot} />;
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
  // Originalen (app.py:6540–6575, 6650–6654): et lag, hvis materiale er slettet, skiftes til
  // manuel indtastning med en advarsel, til næste ændring. Lag 1–2 har originalens standardvalg.
  const [deletedMaterials, setDeletedMaterials] = useState<Record<number, string>>({});
  useEffect(() => {
    if (standard || basis.eo === null || ctx.externalChange) return;
    const normalized: Record<string, SettingValue> = {};
    const deleted: Record<number, string> = {};
    for (let i = 0; i < Number(values.bd_antal_lag); i++) {
      const stored = ctx.session.values[`bd_mat_${i}`];
      const intended = stored ?? ['Stabilgrus SGII 0-32', 'Bundsikringssand'][i];
      if (
        typeof intended === 'string' &&
        intended !== MANUAL_MATERIAL &&
        !ctx.session.data.materialer.some((m) => m.navn === intended)
      ) {
        normalized[`bd_mat_${i}`] = MANUAL_MATERIAL;
        deleted[i] = intended;
      }
      for (const key of [`bd_mat_${i}`, `bd_t_${i}`])
        if (ctx.session.values[key] != null && ctx.session.values[key] !== values[key])
          normalized[key] = values[key] as SettingValue;
    }
    if (Object.keys(deleted).length) setDeletedMaterials((prev) => ({ ...prev, ...deleted }));
    if (Object.keys(normalized).length) ctx.remember(normalized);
  }, [ctx.session, standard, basis.eo, ctx.externalChange]);
  function change(key: string, value: SettingValue) {
    setDeletedMaterials({});
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
      segmented:
        key === 'tilstand' || key.endsWith('_valgt_klasse') || key.endsWith('_valgt_tklasse'),
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
        <div className="dim-slider-head">
          <span id={`${key}-label`} className="dim-slider-label">
            {label}
          </span>
          <output htmlFor={key} className="dim-slider-value">
            {String(values[key])}
          </output>
        </div>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[Number(values[key])]}
          onValueChange={([next]) => change(key, next)}
          thumbProps={{ id: key, 'aria-labelledby': `${key}-label` }}
        />
        <p>{help}</p>
      </div>
    );
  }
  const count = Number(values.bd_antal_lag);
  return (
    <main className="m9-page">
      <PageHeader
        page="dimensionering"
        title="Dimensionering"
        intro={pageIntroduction}
        aside={<SaveState />}
      />
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
            <RotateCcw aria-hidden="true" />
            Nulstil dimensionering
          </Button>
        </div>
        <section className="section-card settings-card dim-step1">
          {content('step1')}
          <div className="dim-input-grid">
            <div className="m9-collapsed-labels">
              {content('subgradeLabel')}
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
                  <Notice>
                    Cv = {String(values[`${prefix}_cv_slider`])} kN/m² → Eᵤ = {input.eu} MPa
                  </Notice>
                  <InfoPopup
                    label="Se korrelationstabel"
                    title="Korrelation mellem Cv og Eᵤ"
                    icon={<TableIcon aria-hidden="true" />}
                  >
                    <table className="data-table summary-table">
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
            <div className="m9-collapsed-labels">
              {content('basisLabel')}
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
                  icon={<LineChart aria-hidden="true" />}
                  wide
                >
                  <img
                    className="dim-scan"
                    src={`/diagrambilleder/${ctx.session.data.designdiagrammer.find((d) => d.klasse === basis.valgt_klasse)?.image_name}`}
                    alt={`Designdiagram for belastningsklasse ${basis.valgt_klasse}`}
                  />
                </InfoPopup>
              )}
              {basis.type === 'trafikklasse' && <TrafficCorrelationPopup input={input} />}
            </div>
            {content('keyFigures')}
            {/* Fast plads til beskeden ved trafikklasse, så kortet ikke flytter sig, når den
                kommer, går eller skifter tekst. */}
            {basis.type === 'trafikklasse' && (
              <div className="dim-basis-message">
                {page.messageKind && (
                  <Notice kind={page.messageKind === 'warning' ? 'warning' : 'info'}>
                    {content('basisMessage')}
                  </Notice>
                )}
              </div>
            )}
          </div>
        </section>
        {(standard || basis.eo !== null) && (
          <section className="section-card settings-card">
            {content('step2')}
            {standard ? (
              <>
                {content('fixedLabel')}
                {content('assumptions')}
              </>
            ) : (
              <>
                <div className="phi-input-layout">
                  <div>
                    <div className="m9-materials-title">
                      {content('materialsLabel')}
                      {field({
                        key: 'bd_antal_lag',
                        integer: true,
                        label: 'Antal lag',
                        kind: 'number',
                        min: 1,
                        max: 3,
                        step: 1,
                      })}
                    </div>
                    {content('materialsHead')}
                    <div className="m9-layers">
                      {Array.from({ length: count }, (_, i) => {
                        const material = input.materialer![i];
                        return (
                          <div
                            className="m9-layer"
                            key={i}
                            role="group"
                            aria-label={`Lag ${i + 1}`}
                          >
                            <div className="m9-layer-row">
                              {content(`layerNumber${i}`)}
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
                              {material.navn === MANUAL_MATERIAL
                                ? field({
                                    key: `bd_phi_m_${i}`,
                                    label: `φᵢ (°) · lag ${i + 1}`,
                                    kind: 'number',
                                    min: 20,
                                    max: 60,
                                    step: 0.5,
                                  })
                                : content(`layerPhi${i}`)}
                            </div>
                            {material.navn === MANUAL_MATERIAL ? (
                              <div className="dim-manual-fields">
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
                              content(`layerNote${i}`)
                            )}
                            {deletedMaterials[i] && (
                              <Notice kind="warning">
                                Materialet '{deletedMaterials[i]}' findes ikke længere i databasen.
                                Laget er skiftet til manuel indtastning.
                              </Notice>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {content('materialsSum')}
                    {content('materialsHelp')}
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
          <section className="section-card settings-card m9-result-block">
            {content('resultHeading')}
            {content('netHeading')}
            <div className="m9-product-choice">
              <ProductPicker
                key={`${prefix}_${ctx.refresh}`}
                id={`${prefix}_geonet`}
                value={result.geonet_navn}
                groups={productPicker(options, {
                  selectedClass: result.valgt_klasse,
                  selectedTraffic: basis.t_klasse,
                  trafficEu: basis.type === 'trafikklasse' ? input.eu : null,
                  runs: input.koersler,
                  table: input.t_basis_table,
                  rules: input.indstillinger?.yderomraade,
                })}
                classLabel={
                  basis.type === 'trafikklasse'
                    ? `trafikklasse ${basis.t_klasse}`
                    : `belastningsklasse ${basis.valgt_klasse}`
                }
                help={schema.fields.find((f) => f.key === `${prefix}_geonet`)?.help}
                onChange={(name) => change(`${prefix}_geonet`, name)}
              />
            </div>
            <NetIntervalNote result={result} />
            <PageResultCards model={page} />
            <ResultStatus input={input} result={result} unit={unit} products={products} />
            <div className="section-card settings-card m9-figure">
              {content('constructionHeading')}
              <ConstructionFigure
                result={result}
                products={products}
                display={ctx.session.data.indstillinger.opbygning}
                netplacering={ctx.session.data.indstillinger.lagfordeling.netplacering}
              />
            </div>
            <div className="section-card settings-card m9-details-card">
              <NetDetails input={input} result={result} products={products} />
              <div className="m9-figure">
                {content('diagramHeading')}
                <PersonalDiagram
                  result={result}
                  products={products}
                  table={input.t_basis_table}
                  showInput={ctx.session.values.bd_dd_vis_din_prik !== false}
                  showEndpoints={ctx.session.values.bd_dd_vis_lag_prikker !== false}
                  onChange={(key, value) => ctx.remember({ [key]: value })}
                />
              </div>
            </div>
            <Accordion type="single" collapsible className="m9-products dim-expander-card">
              <AccordionItem value="products">
                <AccordionTrigger>{page.productExpander?.label}</AccordionTrigger>
                <AccordionContent>
                  <div className="table-wrap">
                    <table
                      className="data-table summary-table product-overview"
                      aria-label="Alle produkter"
                    >
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
                                {sort?.column === c.key
                                  ? sort.direction === 'asc'
                                    ? ' ▲'
                                    : ' ▼'
                                  : ''}
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <CouplingExplanation input={input} result={result} />
            <ResultChecks input={input} result={result} unit={unit} products={products} />
          </section>
        ) : (
          basis.eo !== null && (
            <Notice kind="warning">Ingen gyldig dimensionering for denne kombination.</Notice>
          )
        )}
      </fieldset>
      <PageFooter />
    </main>
  );
}
