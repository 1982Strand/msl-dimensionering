import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { dimensioningInput } from '../src/engine/dimensioning-form.ts';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import {
  reportPage,
  reportFilename,
  resetReportChoices,
  localReportDate,
  REPORT_INTRO,
  REPORT_INTRO_ORIGINAL,
  REPORT_FORMAT_HELP,
  selectReportEmployee,
  resetProjectFields,
  type ReportNode,
} from '../src/report/report-page.ts';
import {
  grundlag_linjer,
  resultat_linjer,
  STANDARD_TEKSTER,
  SECTION_KEYS,
  SECTION_TITLER,
} from '../src/report/report-data.ts';
import {
  elements,
  findBlock,
  elementText,
  isBlock,
  type PageNode,
} from './helpers/dimensioning-page.ts';
import type { FormValues } from '../src/engine/dimensioning-form.ts';
import type { DataState } from '../src/engine/auto-edit.ts';

const reference = JSON.parse(
  readFileSync(new URL('../reference/report-page-cases.json', import.meta.url), 'utf8'),
) as {
  cases: {
    id: string;
    input: {
      tilstand: string;
      eu: number;
      grundlag: string;
      klasse: string | number;
      geonet_navn: string;
      rap_dato: string;
      enhed: string;
      indstillinger: DataState['indstillinger'];
    };
    page: PageNode[];
  }[];
};
function calculation(c: (typeof reference.cases)[number]) {
  const i = c.input,
    prefix = i.tilstand === 'Standard' ? 'std' : 'bd';
  const data = standard_data_state();
  data.indstillinger = structuredClone(i.indstillinger);
  const values: FormValues = {
    tilstand: i.tilstand,
    [`${prefix}_eu_slider`]: i.eu,
    [`${prefix}_grundlag`]: i.grundlag,
    [`${prefix}_geonet`]: i.geonet_navn,
    [`${prefix}_valgt_${i.grundlag === 'Trafikklasse' ? 'tklasse' : 'klasse'}`]: i.klasse,
  };
  return dimensioner(dimensioningInput(values, data));
}
type Event = Record<string, unknown>;
const widgetTypes = new Set(['button', 'checkbox', 'text_input', 'text_area', 'date_input']);
function originalEvents(nodes: PageNode[]): Event[] {
  return nodes.flatMap((n) => {
    if (isBlock(n))
      return [
        ...(n.block === 'expander'
          ? [{ type: 'expander', label: n.label, expanded: n.expanded }]
          : []),
        ...originalEvents(n.children),
      ];
    if (widgetTypes.has(n.type))
      return [
        {
          type: n.type,
          label: n.label,
          value:
            n.type === 'date_input'
              ? String(n.value).replace(
                  /datetime.date\((\d+), (\d+), (\d+)\)/,
                  (_, y, m, d) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
                )
              : n.value,
          disabled: n.disabled,
          help: n.help,
        },
      ];
    if (n.type === 'html') return [{ type: 'html', text: n.value }];
    if (n.type === 'plotly_chart') return [{ type: 'figure' }];
    return [{ type: n.type, text: n.body }];
  });
}
function modelEvents(model: ReturnType<typeof reportPage>): Event[] {
  const events: Event[] = [
    {
      type: 'html',
      text: `<div class="bg-sidehoved"><h1>${model.title}</h1><p>${model.intro}</p></div>`,
    },
  ];
  function node(n: ReportNode) {
    if (n.kind === 'expander') {
      events.push({ type: 'expander', label: n.title, expanded: false });
      n.children.forEach(node);
    } else if (n.kind === 'table_line')
      events.push({
        type: 'table_line',
        key: n.key,
        label: n.label,
        value: n.value,
        shown: n.shown,
      });
    else if (n.kind === 'employee_select')
      events.push({ type: 'employee_select', key: n.key, label: n.label });
    else if (n.kind === 'text_toolbar') events.push({ type: 'text_toolbar', key: n.key });
    else if (n.kind === 'figure') {
      events.push({
        type: 'html',
        text: `<div class="bg-kort-hoved"><div class="bg-kort-titel">${n.title}</div><div class="bg-kort-note">${n.note}</div></div>`,
      });
      n.children?.forEach(node);
      events.push({ type: 'figure' });
    } else if (n.kind === 'divider') events.push({ type: 'divider', text: '---' });
    else if ('text' in n) events.push({ type: n.kind, text: n.text });
    else
      events.push({
        type: n.kind,
        label: n.label,
        value: n.value,
        disabled: n.disabled,
        help: n.help,
      });
  }
  node(model.banner);
  if (model.emptyAction) node(model.emptyAction);
  for (const step of model.steps) {
    events.push({
      type: 'html',
      text: `<div class="bg-trin-hoved"><div class="bg-trin-nr">${step.number}</div><div class="bg-trin-titel">${step.title}</div><div class="bg-trin-opsum">${step.summary}</div></div>`,
    });
    step.children.forEach(node);
  }
  return events;
}

for (const c of reference.cases)
  test(`R4 ${c.id}: hele indholdsstrømmen matcher originalen præcist`, () => {
    const model = reportPage(calculation(c), {}, c.input.rap_dato, c.input.enhed);
    const original = originalEvents(c.page);
    const start = original.findIndex(
      (e) => e.type === 'html' && String(e.text).includes('bg-sidehoved'),
    );
    // Godkendt afvigelse (B-043): Word-omtalen i underteksten er erstattet af PDF.
    const header = original[start];
    assert.ok(String(header.text).includes(`<p>${REPORT_INTRO_ORIGINAL}</p>`));
    header.text = String(header.text).replace(REPORT_INTRO_ORIGINAL, REPORT_INTRO);
    applyB046ApprovedChanges(original);
    applyB048ApprovedChanges(original);
    applyB049ApprovedChanges(original, c);
    // Kun appens globale topbjælke udelades. Widgets: ingen Streamlit-nøgler.
    assert.deepEqual(modelEvents(model), original.slice(start));
    if (model.available) {
      for (const section of SECTION_KEYS)
        assert.equal(
          model.texts[section],
          elementText(
            elements(findBlock(c.page, 'expander', SECTION_TITLER[section])!.children).find(
              (e) => e.type === 'text_area',
            )!,
          ),
        );
    }
  });

/** Kun de eksplicit godkendte B-048-felter/valglister og navnet Kontrol → Kontrollant. */
function applyB048ApprovedChanges(events: Event[]) {
  const control = events.find((e) => e.type === 'text_input' && e.label === 'Kontrol');
  if (!control) return;
  control.label = 'Kontrollant';
  const date = events.findIndex((e) => e.type === 'date_input');
  assert.ok(date >= 0);
  events.splice(
    date,
    0,
    ...[
      'Sagsbehandler-initialer',
      'Sagsbehandler-telefon',
      'Kontrollant-initialer',
      'Kontrollant-mail',
      'Kontrollant-telefon',
    ].map((label) => ({
      type: 'text_input',
      label,
      value: '',
      disabled: false,
      help: null,
    })),
  );
  events.splice(
    date + 6,
    0,
    { type: 'employee_select', key: 'sagsbehandler', label: 'Vælg fra kartotek …' },
    { type: 'employee_select', key: 'kontrollant', label: 'Vælg fra kartotek …' },
    {
      type: 'checkbox',
      label: 'Kontrollant i bunden af rapporten',
      value: false,
      disabled: false,
      help: null,
    },
  );
}

test('B-048: kartotekvalg udfylder fire felter, manuel rettelse bevares, nulstilling undtager dato', () => {
  const employee = {
    navn: 'Anna Jensen',
    initialer: 'AJ',
    mail: 'anna@example.invalid',
    telefon: '12345678',
  };
  const values = {
    ...selectReportEmployee('sagsbehandler', employee),
    ...selectReportEmployee('kontrollant', employee),
    rap_kontrollant_i_bunden: true,
    rap_sagsbehandler_telefon: '87654321',
  };
  const model = reportPage(calculation(reference.cases[0]), values, '2026-09-29');
  assert.equal(model.metadata.sagsbehandler, employee.navn);
  assert.equal(model.metadata.kontrol, employee.navn);
  assert.equal(model.metadata.sagsbehandler_initialer, 'AJ');
  assert.equal(model.metadata.kontrol_mail, employee.mail);
  assert.equal(model.metadata.kontrol_telefon, employee.telefon);
  assert.equal(model.metadata.sagsbehandler_telefon, '87654321');
  assert.equal(model.metadata.kontrollant_i_bunden, true);
  assert.deepEqual(selectReportEmployee('kontrollant', { ...employee, navn: '' }), {});
  const cleared = reportPage(
    calculation(reference.cases[0]),
    { ...values, ...resetProjectFields() },
    '2026-09-29',
  );
  assert.equal(cleared.metadata.dato, '2026-09-29');
  assert.equal(cleared.metadata.kontrollant_i_bunden, false);
  for (const [key, value] of Object.entries(cleared.metadata))
    if (key !== 'dato' && key !== 'kontrollant_i_bunden') assert.equal(value, '');
});

test('R4: originalens filnavn, fallback, skråstreger, trim og 60 Unicode-tegn', () => {
  assert.equal(
    reportFilename({ projekt: 'MSL test', dato: '2026-09-29' }),
    'Dimensionering - MSL test - 2026-09-29.pdf',
  );
  assert.equal(
    reportFilename({ projekt: ' /A\\B/ ', dato: '2026-09-29' }),
    'Dimensionering - -A-B- - 2026-09-29.pdf',
  );
  assert.equal(reportFilename({ projekt: '   ', dato: '' }), 'Dimensionering - MSL-rapport.pdf');
  assert.equal(
    reportFilename({ projekt: '🧱'.repeat(61), dato: '2026-09-29' }),
    `Dimensionering - ${'🧱'.repeat(60)} - 2026-09-29.pdf`,
  );
  assert.equal(
    reportFilename({ projekt: '\ufeffMSL\ufeff', dato: '' }),
    'Dimensionering - \ufeffMSL\ufeff.pdf',
  );
});

/** B-046: præcis navngiven udvidelse af originalens forventninger; ingen normalisering. */
function applyB046ApprovedChanges(events: Event[]) {
  for (const key of SECTION_KEYS) {
    const expander = events.findIndex(
      (e) => e.type === 'expander' && e.label === SECTION_TITLER[key],
    );
    if (expander < 0) continue;
    assert.equal(events[expander + 1].label, 'Nulstil');
    assert.equal(events[expander + 2].type, 'text_area');
    events.splice(
      expander + 2,
      0,
      { type: 'checkbox', label: 'Medtag i rapporten', value: true, disabled: false, help: null },
      { type: 'text_toolbar', key: `rap_tekst_${key}` },
    );
    events.splice(expander + 5, 0, { type: 'caption', text: REPORT_FORMAT_HELP });
  }
  const first = events.findIndex(
    (e) => e.type === 'checkbox' && e.label === 'Personligt designdiagram',
  );
  if (first < 0) return;
  const choices = events.splice(first, 3);
  assert.deepEqual(
    choices.map((e) => e.label),
    [
      'Personligt designdiagram',
      "Vis 'Indtastet opbygning'-prik i designdiagram",
      'Vis endepunkter for 1/2 lag i designdiagram',
    ],
  );
  const diagram = events.findIndex(
    (e) => e.type === 'html' && String(e.text).includes('bg-kort-titel">Designdiagram'),
  );
  assert.ok(diagram >= 0);
  events.splice(diagram + 1, 0, ...choices);
}
test('R4: tomme tekster/navne bevares; fælles nulstilling berører kun tekster og valg', () => {
  const values = {
    rap_projekt: 'MSL test',
    rap_beskrivelse: '',
    rap_tekst_kontrolplan: '',
    rap_std_materiale_0: '',
    rap_vis_uarm: false,
    rap_medtag_kontrolplan: false,
    hjaelp_aabne: [],
    profil: 'bevares',
  };
  const model = reportPage(calculation(reference.cases[0]), values, '2026-09-29');
  assert.equal(model.texts.kontrolplan, '');
  assert.equal(model.choices.medtag_afsnit!.kontrolplan, false);
  assert.equal(model.choices.standard_materialer![0], '');
  const reset = { ...values, ...resetReportChoices(values) };
  assert.equal(reset.rap_projekt, 'MSL test');
  assert.equal(reset.rap_beskrivelse, '');
  assert.equal(reset.profil, 'bevares');
  const restored = reportPage(calculation(reference.cases[0]), reset, '2026-09-29');
  assert.equal(restored.texts.kontrolplan, STANDARD_TEKSTER.kontrolplan);
  assert.equal(restored.figureChoices.rap_vis_uarm, true);
  assert.equal(restored.choices.medtag_afsnit!.kontrolplan, true);
  assert.equal(localReportDate(new Date(2026, 8, 29, 23, 59)), '2026-09-29');
});
test('R4: ugyldigt gemt snit følger den aktuelle betingelse, gyldigt fravalg og diagramvalg huskes', () => {
  const dim = calculation(reference.cases[0])!;
  const model = reportPage(dim, {
    rap_vis_indtastet: true,
    rap_vis_2lag: false,
    rap_vis_designdiagram: false,
    rap_dd_vis_din_prik: false,
  });
  assert.equal(model.figureChoices.rap_vis_indtastet, false);
  assert.equal(model.figureChoices.rap_vis_2lag, false);
  assert.equal(model.figureChoices.rap_dd_vis_din_prik, true); // inaktivt valg følger originalstandarden
  const diagram = model.steps[2].children.find(
    (n) => n.kind === 'figure' && n.key === 'designdiagram',
  );
  assert.ok(diagram?.kind === 'figure'); // B-046: kortet bliver stående ved fravalg.
  assert.equal(diagram.children?.length, 3);
  assert.ok(diagram.children?.slice(1).every((n) => n.kind === 'checkbox' && n.disabled));
  const noSections = reportPage(dim, {
    rap_vis_uarm: false,
    rap_vis_1lag: false,
    rap_vis_2lag: false,
  });
  assert.ok(noSections.steps[3].children.some((n) => n.kind === 'button' && n.disabled));
  const smaller = dimensioner(dimensioningInput({ std_eu_slider: 20 }, standard_data_state()));
  const invalidSaved = reportPage(smaller, { rap_vis_2lag: true }, '2026-09-29', 'cm');
  assert.equal(invalidSaved.figureChoices.rap_vis_2lag, false);
  const checkbox = invalidSaved.steps[2].children.find(
    (n) => n.kind === 'checkbox' && n.key === 'rap_vis_2lag',
  );
  assert.ok(checkbox?.kind === 'checkbox');
  assert.equal(checkbox.disabled, true);
  assert.equal(
    checkbox.help,
    '2 lag geonet anvendes kun ved opbygninger ≥ 50 cm (beregnet 1-lag tykkelse) — derfor ikke relevant her.',
  );
});

/** B-049: kun omdøbning og de eksplicit udskiftede/tilføjede tabelredigeringsrækker.
 * Beregnede værdier kontrolleres særskilt mod de frosne rapporttabeller i report-data.test.ts.
 */
function applyB049ApprovedChanges(events: Event[], c: (typeof reference.cases)[number]) {
  const dim = calculation(c);
  if (!dim?.geonet) return;
  for (const event of events)
    if (typeof event.label === 'string' && event.label.startsWith('Kontrollant'))
      event.label = event.label.replace('Kontrollant', 'Kvalitetssikring');
  const basis = grundlag_linjer(dim, { enhed: c.input.enhed });
  for (const [key, label, value] of basis) {
    const index = events.findIndex((e) => e.type === 'checkbox' && e.label === label);
    assert.ok(index >= 0, label);
    assert.equal(events[index].value, true);
    assert.equal(events[index].disabled, false);
    events[index] = { type: 'table_line', key: `basis_${key}`, label, value, shown: true };
  }
  const insert = events.findIndex(
    (e) => e.type === 'expander' && e.label === 'Krav til komprimering',
  );
  assert.ok(insert >= 0);
  const entered = dim.materialer.some((m) => !!m.tykkelse_mm);
  events.splice(
    insert,
    0,
    { type: 'expander', label: 'Dimensioneringsresultat', expanded: false },
    {
      type: 'caption',
      text: 'Linjerne kan tilpasses og fravælges i rapporten; beregningen berøres ikke.',
    },
    ...resultat_linjer(dim, { enhed: c.input.enhed }).map(([key, label, value]) => ({
      type: 'table_line',
      key: `resultat_${key}`,
      label,
      value,
      shown: key === 'indtastet' ? entered : true,
    })),
  );
}

test('B-049: rettelser huskes, nulstilles ved ændrede værdier og indgår i fælles nulstilling', () => {
  const dim = calculation(reference.cases[0])!;
  const original = resultat_linjer(dim).find(([key]) => key === '1lag')!;
  const edit = {
    beregnet_tekst: original[1],
    beregnet_vaerdi: original[2],
    tekst: 'Tilpasset linje',
    vaerdi: '',
  };
  const values = {
    rap_linje_resultat_1lag: edit,
    rap_resultat_2lag: false,
    rap_grundlag_eu: false,
    rap_projekt: 'Bevares',
  };
  const model = reportPage(dim, values);
  assert.deepEqual(model.choices.linje_rettelser?.resultat_1lag, edit);
  assert.equal(model.choices.resultat_linjer?.['2lag'], false);
  assert.deepEqual(model.resetLines, []);
  const changed = structuredClone(dim);
  assert.ok('t_armeret_mm' in changed.res_1);
  changed.res_1.t_armeret_mm = Number(changed.res_1.t_armeret_mm) + 10;
  const next = reportPage(changed, values);
  assert.deepEqual(next.resetLines, [{ key: 'resultat_1lag', label: original[1] }]);
  assert.equal(next.choices.linje_rettelser?.resultat_1lag, undefined);
  const reset = { ...values, ...resetReportChoices(values) };
  assert.equal(reset.rap_projekt, 'Bevares');
  const restored = reportPage(dim, reset);
  assert.deepEqual(restored.choices.linje_rettelser, {});
  assert.equal(restored.choices.resultat_linjer?.['2lag'], true);
  assert.equal(restored.choices.grundlag_linjer?.eu, true);
  const order = model.steps[1].children.filter((n) => n.kind === 'expander').map((n) => n.key);
  assert.deepEqual(order.slice(0, 4), [
    'oplyste_forudsaetninger',
    'basis',
    'generelle_forudsaetninger',
    'results',
  ]);
});
