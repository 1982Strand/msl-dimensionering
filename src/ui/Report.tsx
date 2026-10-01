import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bold, IndentIncrease, Italic, List } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { formatTextSelection, type TextFormatAction } from '../report/text-format';
import { formatPhone } from '../report/phone-format';
import { useEditor } from './EditorContext';
import { EditorFeedback, SaveState } from './EditorFeedback';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { CompanyProfile, useCompanyProfile } from './CompanyProfile';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import { dimensioningInput } from '../engine/dimensioning-form';
import { dimensioner } from '../engine/dimensionering';
import {
  reportPage,
  reportFilename,
  localReportDate,
  resetReportChoices,
  PERSON_FIELDS,
  selectReportEmployee,
  resetProjectFields,
  type ReportNode,
  type ReportStep,
} from '../report/report-page';
import { reportData, STANDARD_TEKSTER, SECTION_KEYS, type SectionKey } from '../report/report-data';
import { reportFigures } from '../report/report-figures';
import { reportDocument, loadReportAssets, type ReportAssets } from '../report/report-document';
import { logoDataUrl, logoExtension } from '../report/company-profile';
import layoutSource from '../report/typst/layout.typ?raw';
import reportSource from '../report/typst/rapport.typ?raw';
import {
  createCompileQueue,
  describeCompileError,
  type CompileState,
} from '../report/compile-queue';
import { loadPdfCompiler } from '../report/compiler';
import './dimensioning-page.css';
import './expander-card.css';
import './Report.css';

const states = {
  idle: 'Klar til at starte',
  loading: 'Indlæser PDF-motor og lokale skrifter',
  compiling: 'Kompilerer PDF',
  ready: 'PDF klar',
  error: 'Fejl',
};

export function Report({
  date: sessionDate,
  setDate,
  live,
  startLive,
}: {
  date: string | null;
  setDate: (value: string) => void;
  live: boolean;
  startLive: () => void;
}) {
  const ctx = useEditor();
  const company = useCompanyProfile();
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem('msl.report-tab') === 'profile' ? 'profile' : 'report';
    } catch {
      return 'report';
    }
  });
  useEffect(() => {
    if (tab === 'profile' && !live) startLive();
  }, [tab, live, startLive]);
  const logoFingerprint = useMemo(
    () => (company.state.logo ? logoDataUrl(company.state.logo) : null),
    [company.state.logo],
  );
  const date = sessionDate ?? localReportDate();
  useEffect(() => {
    if (sessionDate === null) setDate(date);
  }, [sessionDate, date, setDate]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CompileState>({ status: 'idle' });
  const [preview, setPreview] = useState<{ url: string; fingerprint: string } | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const previewUrl = useRef<string | null>(null);
  const queue = useRef<ReturnType<typeof createCompileQueue> | null>(null);
  const assets = useRef<Promise<ReportAssets> | null>(null);
  const submitted = useRef('');
  const started = useRef(0);
  const input = useMemo(
    () => dimensioningInput(ctx.session.values, ctx.session.data),
    [ctx.session],
  );
  const result = useMemo(() => dimensioner(input), [input]);
  const unit = ctx.session.data.indstillinger.opbygning.enhed;
  const model = reportPage(result, ctx.session.values, date, unit);
  const [resetMessages, setResetMessages] = useState<string[]>([]);
  const handledReset = useRef('');
  useEffect(() => {
    if (ctx.externalChange) return;
    const token = JSON.stringify(model.resetLines);
    if (handledReset.current === token) return;
    handledReset.current = token;
    if (!model.resetLines.length) return;
    setResetMessages((previous) => [
      ...previous,
      ...model.resetLines.map(
        ({ label }) => `Rettelsen af linjen ›${label}‹ er nulstillet, fordi beregningen er ændret.`,
      ),
    ]);
    ctx.remember(Object.fromEntries(model.resetLines.map(({ key }) => [`rap_linje_${key}`, null])));
  }, [JSON.stringify(model.resetLines), ctx.externalChange]);
  const figures = useMemo(
    () =>
      model.available && result
        ? reportFigures(
            result,
            ctx.session.data.indstillinger,
            input.t_basis_table!,
            model.figureChoices,
          )
        : null,
    [result, ctx.session.data, JSON.stringify(model.figureChoices)],
  );
  const data = useMemo(
    () =>
      model.available && result
        ? reportData(result, model.metadata, model.choices, model.texts)
        : null,
    [
      result,
      JSON.stringify(model.metadata),
      JSON.stringify(model.choices),
      JSON.stringify(model.texts),
    ],
  );
  // Alt rapportgrundlag medtages; layoutets versionerede bytes medtages nedenfor.
  const fingerprint = JSON.stringify({
    input,
    result,
    settings: ctx.session.data.indstillinger,
    metadata: model.metadata,
    texts: model.texts,
    choices: model.choices,
    figureChoices: model.figureChoices,
    data,
    figures,
    profile: company.state.profile,
    logo: logoFingerprint,
    layoutSource,
    reportSource,
    filename: reportFilename(model.metadata),
  });
  const canGenerate = model.available && !!figures?.constructionCall?.snit_liste.length;
  const current =
    !!preview &&
    preview.fingerprint === fingerprint &&
    state.status === 'ready' &&
    canGenerate &&
    company.ready &&
    !company.saving;

  useEffect(() => {
    let active = true;
    const currentQueue = createCompileQueue({
      loadCompiler: loadPdfCompiler,
      onState(next) {
        if (!active) return;
        setState(next);
        if (next.status === 'ready') {
          // Egen URL til den synligt forældede forhåndsvisning: køens URL frigives ved ny revision.
          const url = URL.createObjectURL(
            new Blob([new Uint8Array(next.bytes)], { type: 'application/pdf' }),
          );
          if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
          previewUrl.current = url;
          setPreview({ url, fingerprint: submitted.current });
          setElapsed(Math.round(performance.now() - started.current));
        }
      },
    });
    queue.current = currentQueue;
    return () => {
      active = false;
      currentQueue.dispose();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
      queue.current = null;
    };
  }, []);

  useEffect(() => {
    if (!live || !canGenerate || !data || !figures || !company.ready || company.saving) return;
    let active = true;
    // Saml tastetryk; spærringen er allerede aktiv i render via fingeraftrykket.
    const timer = window.setTimeout(() => {
      started.current = performance.now();
      setElapsed(null);
      setState({ status: 'loading' });
      const loading = (assets.current ??= loadReportAssets(import.meta.env.BASE_URL).catch(
        (error) => {
          assets.current = null;
          throw error;
        },
      ));
      void loading
        .then((loaded) => {
          if (!active) return;
          // Skabelonbytes er faste i denne appversion, men indgår i revisionens request.
          const logo = company.state.logo;
          const request = reportDocument(
            data,
            figures,
            logo ? { ...loaded, logo: logo.bytes, logoExtension: logoExtension(logo) } : loaded,
            company.state.profile,
          );
          submitted.current = fingerprint;
          queue.current?.request(request);
        })
        .catch((error) => {
          if (active) setState(describeCompileError(error, 'loading'));
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [live, canGenerate, fingerprint, attempt, company.ready, company.saving]);

  function renderPdf(buttons?: ReactNode, info?: ReactNode) {
    return (
      <>
        <div className="report-generate-toolbar">
          {buttons}
          {current ? (
            <Button asChild>
              <a href={preview!.url} download={reportFilename(model.metadata)}>
                Hent PDF
              </a>
            </Button>
          ) : (
            <Button disabled>Hent PDF</Button>
          )}
          <div className="report-compile-status">
            <p
              role="status"
              data-testid="compile-state"
              data-state={state.status}
              data-revision={state.status === 'ready' ? state.revision : undefined}
            >
              {current
                ? 'Rapporten er genereret.'
                : states[state.status === 'ready' ? 'compiling' : state.status]}
            </p>
            {elapsed !== null && (
              <p className="report-caption">
                Kompileringstid: <output data-testid="compile-time">{elapsed}</output> ms (inklusive
                eventuel indlæsning)
              </p>
            )}
          </div>
        </div>
        {info}
        {state.status === 'error' && (
          <div role="alert" className="warning-banner">
            <p>{state.message}</p>
            <pre>{state.details}</pre>
          </div>
        )}
        {preview && (
          <div className="report-pdf">
            {!current && (
              <p role="status" className="warning-banner report-stale">
                Forhåndsvisningen er forældet. Hent PDF er spærret, indtil rapporten for de aktuelle
                oplysninger er klar.
              </p>
            )}
            <iframe title="PDF-forhåndsvisning" src={preview.url} />
          </div>
        )}
      </>
    );
  }

  function action(key: string) {
    if (key === 'generate') {
      startLive();
      setAttempt((n) => n + 1);
    } else if (key === 'reset-fields') {
      ctx.remember(resetProjectFields());
      setDate(localReportDate());
    } else if (key.startsWith('reset-')) {
      const section = key.slice(6) as SectionKey;
      ctx.remember({ [`rap_tekst_${section}`]: STANDARD_TEKSTER[section] });
    }
  }
  function renderNode(node: ReportNode, i: number) {
    const key = 'key' in node ? node.key : i;
    if (node.kind === 'divider') return <hr key={key} />;
    if (node.kind === 'table_line') {
      const label = node.calculated.beregnet_tekst;
      const edit = (field: 'tekst' | 'vaerdi', value: string) => {
        ctx.remember({
          [`rap_linje_${node.key}`]: {
            ...node.calculated,
            tekst: node.label,
            vaerdi: node.value,
            [field]: value,
          },
        });
      };
      return (
        <div
          key={key}
          className="report-table-line"
          role="group"
          aria-label={label}
          data-line={node.key}
        >
          <label className="setting-checkbox" htmlFor={node.visibilityKey}>
            <input
              id={node.visibilityKey}
              type="checkbox"
              checked={node.shown}
              onChange={(event) => ctx.remember({ [node.visibilityKey]: event.target.checked })}
            />
            <span>Vis i rapporten</span>
          </label>
          <Textarea
            rows={node.label.includes('\n') ? 2 : 1}
            aria-label={`Tekst: ${label}`}
            value={node.label}
            onChange={(event) => edit('tekst', event.target.value)}
          />
          <Textarea
            rows={node.value.includes('\n') ? 2 : 1}
            aria-label={`Værdi: ${label}`}
            value={node.value}
            onChange={(event) => edit('vaerdi', event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              ctx.remember({
                [`rap_linje_${node.key}`]: null,
                [node.visibilityKey]: null,
              })
            }
          >
            Nulstil
          </Button>
        </div>
      );
    }
    if (node.kind === 'employee_select') {
      const employees = company.state.profile.medarbejdere;
      return employees.length ? (
        <div key={key} className="setting-field report-field">
          <label htmlFor={'employee-' + node.key}>{node.label}</label>
          <select
            id={'employee-' + node.key}
            value=""
            disabled={!company.ready || company.saving}
            onChange={(event) => {
              if (event.target.value === '') return;
              const person = employees[Number(event.target.value)];
              if (person) ctx.remember(selectReportEmployee(node.key, person));
            }}
          >
            <option value="">Vælg fra kartotek …</option>
            {employees.map((person, index) => (
              <option key={index} value={index}>
                {person.initialer ? `${person.initialer} – ${person.navn}` : person.navn}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p key={key} className="report-caption">
          Kartoteket er tomt. Tilføj personer under Firmaprofil → Medarbejdere.
        </p>
      );
    }
    if (node.kind === 'caption' || node.kind === 'info' || node.kind === 'success')
      return (
        <div key={key} className={node.kind === 'info' ? 'info-banner' : `report-${node.kind}`}>
          <ReactMarkdown>{node.text}</ReactMarkdown>
        </div>
      );
    if (node.kind === 'expander')
      return (
        <Accordion key={key} type="multiple" className="dim-expander-card">
          <AccordionItem value={node.key}>
            <AccordionTrigger>{node.title}</AccordionTrigger>
            <AccordionContent>
              <div className="report-editor">
                {SECTION_KEYS.includes(node.key as SectionKey) ? (
                  <>
                    <div className="report-section-actions">
                      {node.children
                        .filter((child) => child.kind === 'button' || child.kind === 'checkbox')
                        .map(renderNode)}
                    </div>
                    {node.children
                      .filter((child) => child.kind !== 'button' && child.kind !== 'checkbox')
                      .map(renderNode)}
                  </>
                ) : (
                  node.children.map(renderNode)
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    if (node.kind === 'text_toolbar') {
      const fieldKey = node.key;
      function format(action: TextFormatAction) {
        const field = document.getElementById(fieldKey) as HTMLTextAreaElement | null;
        if (!field) return;
        const next = formatTextSelection(
          field.value,
          field.selectionStart,
          field.selectionEnd,
          action,
        );
        ctx.remember({ [fieldKey]: next.value });
        requestAnimationFrame(() => {
          field.focus();
          field.setSelectionRange(next.start, next.end);
        });
      }
      return (
        <div
          key={`toolbar-${key}`}
          className="report-text-toolbar"
          role="group"
          aria-label="Tekstformatering"
        >
          {(
            [
              ['bold', 'Fed', Bold],
              ['italic', 'Kursiv', Italic],
              ['bullet', 'Punkt', List],
              ['indent', 'Indrykning', IndentIncrease],
            ] as const
          ).map(([action, label, Icon]) => (
            <Tooltip key={action}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => format(action)}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {label === 'Punkt'
                  ? 'Sæt punkt foran de markerede linjer'
                  : label === 'Indrykning'
                    ? 'Indryk de markerede linjer som et tryk på tabulator. Et indrykket punkt bliver et underpunkt.'
                    : `Formatér markeringen: ${label.toLowerCase()}`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      );
    }
    if (node.kind === 'figure') {
      const figure = figures?.[node.key];
      return figure || node.key === 'designdiagram' ? (
        <section key={key} className="section-card settings-card m9-figure report-figure">
          <div data-m9-slot={node.key}>
            <div className="bg-kort-hoved">
              <h2 className="bg-kort-titel">{node.title}</h2>
              <p className="bg-kort-note">{node.note}</p>
            </div>
          </div>
          {node.children && (
            <div className="report-diagram-choices">{node.children.map(renderNode)}</div>
          )}
          {figure && <div dangerouslySetInnerHTML={{ __html: figure.svg }} />}
        </section>
      ) : null;
    }
    if (node.kind === 'button')
      return (
        <Button
          key={key}
          type="button"
          variant={node.key === 'generate' ? 'default' : 'outline'}
          title={node.help ?? undefined}
          disabled={node.disabled || (node.key === 'generate' && !canGenerate)}
          onClick={() => action(node.key)}
        >
          {node.label}
        </Button>
      );
    const change = (value: string | boolean) =>
      node.key === 'rap_dato' ? setDate(String(value)) : ctx.remember({ [node.key]: value });
    return (
      <div key={key} className={`setting-field report-field report-${node.kind}`}>
        <label
          htmlFor={node.key}
          className={node.kind === 'checkbox' ? 'setting-checkbox' : undefined}
        >
          {node.kind === 'checkbox' && (
            <input
              id={node.key}
              type="checkbox"
              checked={!!node.value}
              disabled={node.disabled}
              aria-describedby={node.help ? `${node.key}-help` : undefined}
              onChange={(e) => change(e.target.checked)}
            />
          )}
          <span>{node.label}</span>
        </label>
        {node.kind === 'text_area' ? (
          <Textarea
            id={node.key}
            rows={node.key.startsWith('rap_tekst_') ? 9 : 3}
            value={String(node.value)}
            disabled={node.disabled}
            aria-describedby={node.help ? `${node.key}-help` : undefined}
            onChange={(e) => change(e.target.value)}
          />
        ) : (
          node.kind !== 'checkbox' && (
            <Input
              id={node.key}
              type={node.kind === 'date_input' ? 'date' : 'text'}
              value={String(node.value)}
              disabled={node.disabled}
              aria-describedby={node.help ? `${node.key}-help` : undefined}
              onChange={(e) => change(e.target.value)}
              onBlur={(e) => {
                if (node.key.endsWith('_telefon')) change(formatPhone(e.target.value));
              }}
            />
          )
        )}
        {node.help && <p id={`${node.key}-help`}>{node.help}</p>}
      </div>
    );
  }

  function renderStep(step: ReportStep) {
    const nodes = step.children;
    if (step.number === 1) {
      const fields = nodes.filter(
        (node) =>
          node.kind === 'text_input' || node.kind === 'text_area' || node.kind === 'date_input',
      );
      const personKeys = Object.values(PERSON_FIELDS)
        .flat()
        .map((name) => 'rap_' + name);
      const leftKeys = ['rap_projekt', 'rap_omfang'];
      return (
        <>
          <div className="report-fields-toolbar">
            {nodes
              .filter((node) => node.kind === 'caption' || node.kind === 'button')
              .map(renderNode)}
          </div>
          <div className="report-project-columns">
            <div>
              {fields
                .filter((node) => 'key' in node && leftKeys.includes(node.key))
                .map(renderNode)}
            </div>
            <div>
              {fields
                .filter(
                  (node) =>
                    'key' in node && !leftKeys.includes(node.key) && !personKeys.includes(node.key),
                )
                .map(renderNode)}
            </div>
          </div>
          <div className="report-project-columns">
            {(['sagsbehandler', 'kontrollant'] as const).map((role) => (
              <fieldset key={role} className="report-person">
                <legend>{role === 'sagsbehandler' ? 'Sagsbehandler' : 'Kvalitetssikring'}</legend>
                {nodes
                  .filter((node) => node.kind === 'employee_select' && node.key === role)
                  .map(renderNode)}
                {PERSON_FIELDS[role].map((name) =>
                  fields
                    .filter((node) => 'key' in node && node.key === 'rap_' + name)
                    .map(renderNode),
                )}
                {role === 'kontrollant' &&
                  nodes.filter((node) => node.kind === 'checkbox').map(renderNode)}
              </fieldset>
            ))}
          </div>
          {nodes.filter((node) => node.kind === 'divider').map(renderNode)}
        </>
      );
    }
    if (step.number === 3) {
      const cuts = ['rap_vis_indtastet', 'rap_vis_uarm', 'rap_vis_1lag', 'rap_vis_2lag'];
      return (
        <>
          <div className="report-cut-choices">
            {nodes
              .filter((node) => node.kind === 'checkbox' && cuts.includes(node.key))
              .map(renderNode)}
          </div>
          {nodes.filter((node) => node.kind !== 'checkbox').map(renderNode)}
        </>
      );
    }
    if (step.number === 4) {
      return renderPdf(
        nodes.filter((node) => node.kind === 'button').map(renderNode),
        nodes
          .filter((node) => node.kind !== 'button')
          .map((node, i) => (
            <div key={i} className="info-banner">
              {renderNode(node, i)}
            </div>
          )),
      );
    }
    return (
      <>
        {nodes.map(renderNode)}
        <Button
          className="report-reset-content"
          variant="outline"
          type="button"
          onClick={() => {
            ctx.remember(resetReportChoices(ctx.session.values));
            setResetMessages([]);
          }}
        >
          Nulstil tekster og valg til standard
        </Button>
      </>
    );
  }

  return (
    <main className="m9-page report-page">
      <div className="breadcrumb">Rapport</div>
      <div className="page-heading">
        <div>
          <h1>{model.title}</h1>
          <p className="intro">{model.intro}</p>
        </div>
        <SaveState />
      </div>
      <EditorFeedback />
      {resetMessages.length > 0 && (
        <div className="info-banner" role="status">
          {resetMessages.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </div>
      )}
      {renderNode(model.banner, 0)}
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value);
          try {
            sessionStorage.setItem('msl.report-tab', value);
          } catch {
            /* Fanen huskes stadig i den åbne visning. */
          }
        }}
      >
        <TabsList aria-label="Rapport og firmaprofil">
          <TabsTrigger value="report">Rapport</TabsTrigger>
          <TabsTrigger value="profile">Firmaprofil</TabsTrigger>
        </TabsList>
        <TabsContent value="report">
          {!model.available ? (
            <Button asChild>
              <a href="#dimensionering">{model.emptyAction!.label}</a>
            </Button>
          ) : (
            <fieldset disabled={ctx.externalChange} className="report-form">
              {model.steps.map((step) => (
                <section
                  key={step.number}
                  className="section-card settings-card"
                  aria-labelledby={'report-step-' + step.number}
                >
                  <div data-m9-slot="report">
                    <div className="bg-trin-hoved">
                      <h2 id={'report-step-' + step.number}>
                        <span className="bg-trin-nr">{step.number}</span>
                        <span className="bg-trin-titel">{step.title}</span>
                      </h2>
                      <span className="bg-trin-opsum">{step.summary}</span>
                    </div>
                  </div>
                  <div className={'report-step report-step-' + step.number}>{renderStep(step)}</div>
                </section>
              ))}
            </fieldset>
          )}
        </TabsContent>
        <TabsContent value="profile">
          <CompanyProfile
            controller={company}
            standardLogo={async () => {
              const loaded = await (assets.current ??= loadReportAssets(
                import.meta.env.BASE_URL,
              ).catch((error) => {
                assets.current = null;
                throw error;
              }));
              return { mime: 'image/jpeg', bytes: loaded.logo };
            }}
            preview={
              model.available ? (
                renderPdf()
              ) : (
                <p className="info-banner">
                  {model.emptyAction &&
                    'Der skal først foretages en dimensionering med et valgt geonet, før rapporten kan genereres.'}
                </p>
              )
            }
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
