/** Read-only, reproducible M9 mapping. Run: node tools/dimensioning-page-inventory.ts */
import { pageCases, isBlock } from '../tests/helpers/dimensioning-page.ts';
import { pageCoverage } from '../tests/helpers/dimensioning-page-coverage.ts';

export function dimensioningPageInventory() {
  const rows = ['| Tilfælde | Del | Elementstier | Blokstier |', '| --- | --- | --- | --- |'];
  let leaves = 0,
    blocks = 0;
  for (const c of pageCases) {
    const inventory = pageCoverage(c.page);
    leaves += inventory.filter((e) => !isBlock(e.node)).length;
    blocks += inventory.filter((e) => isBlock(e.node)).length;
    for (const owner of [...new Set(inventory.map((e) => e.owner))]) {
      const owned = inventory.filter((e) => e.owner === owner);
      const paths = (block: boolean) =>
        owned
          .filter((e) => isBlock(e.node) === block)
          .map((e) => `\`${e.path}\``)
          .join(', ') || '—';
      rows.push(
        `| ${c.id} | ${owner === 'layout' ? 'M9 (fælles layout)' : owner} | ${paths(false)} | ${paths(true)} |`,
      );
    }
  }
  return `Kortlægningen omfatter alle ${leaves} blade og ${blocks} blokke i de 17 tilfælde. Stier er nulbaserede indeks fra page gennem children, fx 2.1.2.0. Hvert blad forekommer én gang. Fælles kolonne-/containerblokke hører til M9-layoutet; blokkenes indhold følger de særskilte ejere.\n\n${rows.join('\n')}\n`;
}
if (process.argv[1]?.endsWith('dimensioning-page-inventory.ts'))
  console.log(dimensioningPageInventory());
