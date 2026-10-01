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
  type ReportNode,
} from '../src/report/report-page.ts';
import { STANDARD_TEKSTER, SECTION_KEYS, SECTION_TITLER } from '../src/report/report-data.ts';
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
    } else if (n.kind === 'figure')
      events.push(
        {
          type: 'html',
          text: `<div class="bg-kort-hoved"><div class="bg-kort-titel">${n.title}</div><div class="bg-kort-note">${n.note}</div></div>`,
        },
        { type: 'figure' },
      );
    else if (n.kind === 'divider') events.push({ type: 'divider', text: '---' });
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
test('R4: tomme tekster/navne bevares; fælles nulstilling berører kun tekster og valg', () => {
  const values = {
    rap_projekt: 'MSL test',
    rap_beskrivelse: '',
    rap_tekst_kontrolplan: '',
    rap_std_materiale_0: '',
    rap_vis_uarm: false,
    hjaelp_aabne: [],
    profil: 'bevares',
  };
  const model = reportPage(calculation(reference.cases[0]), values, '2026-09-29');
  assert.equal(model.texts.kontrolplan, '');
  assert.equal(model.choices.standard_materialer![0], '');
  const reset = { ...values, ...resetReportChoices(values) };
  assert.equal(reset.rap_projekt, 'MSL test');
  assert.equal(reset.rap_beskrivelse, '');
  assert.equal(reset.profil, 'bevares');
  const restored = reportPage(calculation(reference.cases[0]), reset, '2026-09-29');
  assert.equal(restored.texts.kontrolplan, STANDARD_TEKSTER.kontrolplan);
  assert.equal(restored.figureChoices.rap_vis_uarm, true);
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
  assert.ok(!model.steps[2].children.some((n) => n.kind === 'figure' && n.key === 'designdiagram'));
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
