/** Local M5 integration probe: real Plotly SVG -> actual browser Typst 0.7.0.
 * Uses read-only demo dependencies/fonts; does not modify or run the demo app.
 * Run: node tools/verify_personal_diagram_pdf.mjs <demo-directory>
 */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { byg_designdiagram } from '../src/engine/personal-diagram.ts';

const root = resolve('.'),
  demo = resolve(process.argv[2]);
const output = resolve('output/personal-diagram-review');
await mkdir(output, { recursive: true });
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, demo] } },
});
await server.listen();
const port = server.httpServer.address().port;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/#dimensionering`);
  const chart = page.getByRole('img', { name: 'Personligt designdiagram' });
  await chart.locator('.main-svg').first().waitFor();
  await chart.screenshot({ path: `${output}/standard-screen.png` });
  // Real mouse interaction exercises Plotly hover, not a reconstructed label.
  await chart.locator('.scatterlayer .points .point').first().hover({ force: true });
  await chart.locator('.hoverlayer .hovertext').first().waitFor();
  const hoverText = await chart.locator('.hoverlayer').textContent();
  assert.match(hoverText ?? '', /1 lag geonet/);
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  const points = page.getByRole('checkbox', { name: 'Vis endepunkter for 1 og 2 lag geonet' });
  await points.uncheck();
  await page.reload();
  assert.equal(await points.isChecked(), false);
  await points.check();
  await chart.locator('.main-svg').first().waitFor();
  await chart.screenshot({ path: `${output}/custom-screen.png` });

  const fixtures = JSON.parse(await readFile('reference/personal-diagram-cases.json', 'utf8'));
  const ids = [
    'FIG-001-standard-default',
    'FIG-002-standard-interval',
    'FIG-003-custom-interval',
    'M5-scaled-boundary',
  ];
  const examples = ids.map((id) => ({
    id,
    spec: byg_designdiagram(fixtures.cases.find((c) => c.id === id).kwargs),
  }));
  const paths = {
    module: `/@fs/${demo.replaceAll('\\', '/')}/node_modules/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js`,
    wasm: `/@fs/${demo.replaceAll('\\', '/')}/node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm`,
    fonts: ['Carlito-Regular', 'Carlito-Bold', 'LiberationSans-Regular'].map(
      (name) => `/@fs/${demo.replaceAll('\\', '/')}/skabelon/fonts/${name}.ttf`,
    ),
  };
  const result = await page.evaluate(
    async ({ examples, paths }) => {
      const { personalDiagramSvg } = await import('/src/ui/plotly-export.ts');
      const { $typst, TypstSnippet } = await import(paths.module);
      $typst.setCompilerInitOptions({ getModule: () => new URL(paths.wasm, location.href) });
      $typst.use(
        TypstSnippet.disableDefaultFontAssets(),
        TypstSnippet.preloadFonts(paths.fonts.map((f) => new URL(f, location.href).href)),
      );
      const svgs = [];
      for (const { id, spec } of examples) {
        const svg = await personalDiagramSvg(spec, {
          fontFamily: 'Carlito',
          fontUrl: new URL(paths.fonts[0], location.href).href,
        });
        svgs.push({ id, svg });
        await $typst.mapShadow(`/${id}.svg`, new TextEncoder().encode(svg));
      }
      await $typst.addSource(
        '/m5.typ',
        '#set page(paper: "a4", margin: 20mm)\n#set text(font: "Carlito", size: 11pt)\n' +
          examples
            .map(({ id }) => `= ${id}\n#image("${id}.svg", width: 170mm)`)
            .join('\n#pagebreak()\n'),
      );
      const compiler = await $typst.getCompiler();
      const compiled = await compiler.compile({
        mainFilePath: '/m5.typ',
        format: 1,
        diagnostics: 'full',
      });
      if (!compiled.result) throw new Error(JSON.stringify(compiled.diagnostics));
      return { pdf: Array.from(compiled.result), diagnostics: compiled.diagnostics, svgs };
    },
    { examples, paths },
  );
  assert.equal(Buffer.from(result.pdf).subarray(0, 5).toString(), '%PDF-');
  assert.deepEqual(result.diagnostics ?? [], []);
  assert.deepEqual(errors, []);
  await writeFile(`${output}/m5-plotly-typst.pdf`, Buffer.from(result.pdf));
  for (const { id, svg } of result.svgs) {
    assert.match(svg, /Bærelagstykkelse/);
    assert.match(svg, /Bundmodul/);
    assert.ok(!svg.includes('<image'), 'Expected vector chart, not raster image');
    await writeFile(`${output}/${id}.svg`, svg);
  }
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(
      {
        compiler: 'typst.ts / typst-ts-web-compiler 0.7.0 from read-only demo',
        cases: ids,
        pdf_bytes: result.pdf.length,
        diagnostics: result.diagnostics,
        hover: hoverText,
        svg_font: 'Carlito',
        ui_points_persisted: true,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ status: 'passed', cases: ids, pdf_bytes: result.pdf.length, output }),
  );
} finally {
  await browser.close();
  await server.close();
}
