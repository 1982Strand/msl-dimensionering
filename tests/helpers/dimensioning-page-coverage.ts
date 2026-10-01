/** Independent inventory of the captured tree, including every leaf and block. */
import { isBlock, elementText, blockLabel, type PageNode } from './dimensioning-page.ts';

const slots: [RegExp, string][] = [
  [/bg-sidehoved/, 'pageHeading'],
  [/bg-noegletal/, 'keyFigures'],
  [/bg-trin-nr">1</, 'step1'],
  [/bg-trin-nr">2</, 'step2'],
  [/bg-eyebrow">UNDERBUNDENS STYRKE/, 'subgradeLabel'],
  [/bg-eyebrow">DIMENSIONERINGSGRUNDLAG/, 'basisLabel'],
  [/bg-eyebrow">FASTE FORUDSÆTNINGER/, 'fixedLabel'],
  [/^I standardberegningen/, 'assumptions'],
  [/bg-eyebrow">MATERIALELAG/, 'materialsLabel'],
  [/bg-lagtabel-hoved/, 'materialsHead'],
  [/bg-lagtabel-sum/, 'materialsSum'],
  [/^Mindste lagtykkelse der kan indtastes/, 'materialsHelp'],
  [/bg-resultat-hoved-a/, 'resultHeading'],
  [/bg-underhoved"><div class="t">Vælg geonet/, 'netHeading'],
  [/^<div style="display:grid;grid-template-columns:1.15fr/, 'cards'],
  [/bg-kort-titel">Opbygning</, 'constructionHeading'],
  [/bg-underhoved-skillelinje/, 'diagramHeading'],
  [/<b>.*(?:ligger .*tolerancen|er uden for de kørte punkter)/, 'basisMessage'],
];
export interface CoverageEntry {
  path: string;
  kind: string;
  owner: string;
  label: string;
  slot?: string;
  node: PageNode;
}
export function pageCoverage(nodes: PageNode[]): CoverageEntry[] {
  const entries: CoverageEntry[] = [];
  let layer = -1;
  function walk(children: PageNode[], path: string, scope?: string) {
    children.forEach((node, i) => {
      const address = path ? `${path}.${i}` : String(i);
      if (isBlock(node)) {
        const label = blockLabel(node) ?? '';
        const owner =
          !path && i === 0
            ? 'uden for siden'
            : label.startsWith('Alle produkter')
              ? 'produktoversigten'
              : label.includes('Sådan er resultatet beregnet')
                ? 'M1'
                : label.startsWith('Kontrolpunkter') || label.startsWith('Udførelseskrav')
                  ? 'M3/M7'
                  : label === 'Se korrelationstabel'
                    ? 'M8'
                    : scope;
        entries.push({
          path: address,
          kind: node.block,
          owner: label.startsWith('Alle produkter') ? 'M9' : (owner ?? 'layout'),
          label,
          node,
        });
        walk(node.children, address, owner);
        return;
      }
      const raw = elementText(node);
      const text = typeof raw === 'string' ? raw : String(node.label ?? '');
      let slot = slots.find(([pattern]) => pattern.test(text))?.[1];
      if (text.includes('bg-lagtabel-nr')) {
        layer++;
        slot = `layerNumber${layer}`;
      }
      if (text.includes('bg-lagtabel-phi')) slot = `layerPhi${layer}`;
      if (text.includes('bg-lagtabel-note')) slot = `layerNote${layer}`;
      let owner = slot ? 'M9' : undefined;
      if (!owner && (text.includes('MSL-dimensionering') || node.label === 'Nulstil'))
        owner = 'uden for siden';
      if (!owner && scope) owner = scope;
      if (
        !owner &&
        ['button_group', 'slider', 'selectbox', 'number_input', 'checkbox', 'imgs'].includes(
          node.type,
        )
      )
        owner = 'widgets (UI-reference)';
      if (
        !owner &&
        (text.includes('bg-produkt-interval-note') ||
          text.includes('rt-detaljer') ||
          text.includes('bg-kort-titel">Detaljer'))
      )
        owner = 'M4';
      if (!owner && text.includes('bg-resultat-status')) owner = 'M3/M7';
      if (
        !owner &&
        (text.includes('Φᵥ-KORREKTION') ||
          text === '**Vægtet friktionsvinkel**' ||
          text === '**φᵥ-korrektionsfaktor**' ||
          text.includes('kob-formel') ||
          text === 'Korrektionen anvendes på basistykkelsen.' ||
          node.type === 'code')
      )
        owner = 'M6';
      if (!owner && node.type === 'warning') owner = 'M3/M7';
      if (!owner && node.type === 'empty') owner = 'M3/M7'; // empty result-status slot (LT-1)
      if (!owner && node.type === 'plotly_chart')
        owner = entries.some((e) => e.slot === 'diagramHeading') ? 'M5' : 'opbygningsfiguren';
      if (!owner) throw new Error(`Udækket element ${address}: ${node.type} ${text.slice(0, 150)}`);
      entries.push({
        path: address,
        kind: node.type,
        owner,
        label: slot ?? String(node.label ?? text).slice(0, 90),
        ...(slot ? { slot } : {}),
        node,
      });
    });
  }
  walk(nodes, '');
  return entries;
}
