// Fælles adgang til reference/dimensioning-page-cases.json (M3, M4, M7, M8, M9).
// Referencen er hele originalens viste dimensioneringsside som et træ; se reference/README.md.
import { readFileSync } from 'node:fs';
import type { DimensioningInput } from '../../src/engine/dimensionering.ts';
import { koersler_fra_raekker } from '../../src/engine/editing.ts';

export type PageElement = { type: string; [key: string]: unknown };
export type PageBlock = { block: string; children: PageNode[]; [key: string]: unknown };
export type PageNode = PageElement | PageBlock;
export interface PageCase {
  id: string;
  input: {
    tilstand: 'Standard' | 'Brugerdefineret';
    eu: number;
    grundlag: 'Belastningsklasse' | 'Trafikklasse';
    klasse: number | string;
    enhed: 'mm' | 'cm';
    geonet_navn: string;
    variant: null | 'vis_eksakt' | 'daeklag' | 'sg' | 'vejdim' | 'phi40' | 'soejle';
    indstillinger: NonNullable<DimensioningInput['indstillinger']>;
    vejdim_koersel_raekker: Record<string, unknown>[] | null;
    materialer: NonNullable<DimensioningInput['materialer']>;
  };
  page: PageNode[];
}

export const pageReference: { cases: PageCase[] } = JSON.parse(
  readFileSync(new URL('../../reference/dimensioning-page-cases.json', import.meta.url), 'utf8'),
);
export const pageCases = pageReference.cases;
export const pageCase = (id: string) => pageCases.find((c) => c.id === id)!;

/** Originalens sessionsværdier for casen, oversat til motorens input. */
export function pageCaseInput(c: PageCase): DimensioningInput {
  const i = c.input;
  return {
    tilstand: i.tilstand,
    eu: i.eu,
    grundlag:
      i.grundlag === 'Trafikklasse'
        ? { type: 'trafikklasse', t_klasse: String(i.klasse) }
        : { type: 'belastningsklasse', klasse: Number(i.klasse) },
    geonet_navn: i.geonet_navn,
    materialer: i.tilstand === 'Standard' ? [] : structuredClone(i.materialer),
    // PH-1: »Overskriv φᵥ manuelt« med φᵥ = 40° (bd_phi_override/bd_phi_man).
    phi_manuel: i.variant === 'phi40' ? 40 : null,
    indstillinger: structuredClone(i.indstillinger),
    // TR-1-SG: den aktive VejDim-tabel med ændret række; ellers motorens standard.
    koersler: i.vejdim_koersel_raekker ? koersler_fra_raekker(i.vejdim_koersel_raekker) : null,
  };
}

export const isBlock = (n: PageNode): n is PageBlock => 'block' in n;

/** Alle elementer under noden i visningsrækkefølge. */
export function elements(nodes: PageNode[]): PageElement[] {
  return nodes.flatMap((n) => (isBlock(n) ? elements(n.children) : [n]));
}

/** Alle blokke under noden (dybde først), fx expandere og popupper. */
export function blocks(nodes: PageNode[]): PageBlock[] {
  return nodes.flatMap((n) => (isBlock(n) ? [n, ...blocks(n.children)] : []));
}

/** Etiketten på en expander eller popup. */
export function blockLabel(b: PageBlock): string | undefined {
  const own = b as {
    label?: string;
    expandable?: { label?: string };
    popover?: { label?: string };
  };
  return own.label ?? own.expandable?.label ?? own.popover?.label;
}

/** Den eneste blok af typen, hvis etiket starter med prefix; undefined hvis ingen findes. */
export function findBlock(nodes: PageNode[], type: string, prefix: string): PageBlock | undefined {
  const found = blocks(nodes).filter(
    (b) => b.block === type && (blockLabel(b) ?? '').startsWith(prefix),
  );
  if (found.length > 1) throw new Error(`Flere ${type}-blokke starter med »${prefix}«`);
  return found[0];
}

/** Tekstindholdet i et element: html-krop, markdown-/caption-krop eller widgetetiket. */
export function elementText(e: PageElement): string | undefined {
  const own = e as { value?: string; body?: string; label?: string };
  return own.value ?? own.body ?? own.label;
}
