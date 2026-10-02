/** Præsentation alene: ingen tal beregnes eller afrundes her. */
import type { CouplingNode } from '../../engine/kobling-explanation.ts';

export interface Glyph {
  text: string;
  bold?: boolean;
  weak?: boolean;
  sub?: boolean;
}
export type Inline = Glyph[];
export type MathItem =
  | (Glyph & { kind: 'number' | 'identifier' | 'operator' | 'unit' | 'space' })
  | (Glyph & { kind: 'index'; base: string; index: string; suffix: string })
  | {
      kind: 'fraction';
      numerator: MathItem[];
      denominator: MathItem[];
      numeratorParens: boolean;
      denominatorParens: boolean;
    };
export type Cell = { kind: 'text'; content: Inline } | { kind: 'math'; items: MathItem[] };
export type FormulaLine =
  | { kind: 'equation'; label: Inline; items: MathItem[]; note: Inline }
  | { kind: 'text'; content: Inline; template: string; fallback: boolean }
  | { kind: 'blank' }
  | { kind: 'grid'; rows: Cell[][] }
  | { kind: 'sum'; rows: SumRow[] };
export interface SumRow {
  sign: Inline;
  label: Inline;
  value: Inline;
  note: Inline;
  final: boolean;
}
export interface FormulaLayout {
  lines: FormulaLine[];
}
const text = (s: Inline) => s.map((c) => c.text).join('');
const trim = (s: Inline) => {
  let start = 0;
  let end = s.length;
  while (start < end && /\s/.test(s[start].text)) start++;
  while (end > start && /\s/.test(s[end - 1].text)) end--;
  return s.slice(start, end);
};
// String/RegExp offsets use UTF-16; keep the same offsets even for unknown emoji/prose.
const glyphs = (s: string): Inline => s.split('').map((text) => ({ text }));

/** Styles and explicit <sub> survive splitting, including newlines inside inline nodes. */
function inputLines(nodes: CouplingNode[]) {
  const lines: { content: Inline; final: boolean }[] = [{ content: [], final: false }];
  function visit(n: CouplingNode, style: Omit<Glyph, 'text'> = {}, final = false) {
    if (typeof n !== 'string') {
      if (n.tag === 'br') {
        lines.push({ content: [], final: false });
        return;
      }
      n.children.forEach((child) =>
        visit(
          child,
          {
            ...style,
            ...(n.tag === 'b' ? { bold: true } : {}),
            ...(n.tag === 'sub' ? { sub: true } : {}),
            ...(n.className?.split(' ').includes('kob-svag') ? { weak: true } : {}),
          },
          final || n.className === 'kob-slutlinje',
        ),
      );
      return;
    }
    for (const char of n.split('')) {
      if (char === '\n') lines.push({ content: [], final: false });
      else {
        lines.at(-1)!.content.push({ text: char, ...style });
        lines.at(-1)!.final ||= final;
      }
    }
  }
  nodes.forEach((n) => visit(n));
  return lines;
}

const indices: Record<string, [string, string, string]> = {
  'Eₒ,ækv': ['E', 'o,ækv', 'ₒ,ækv'],
  Eᵤ: ['E', 'u', 'ᵤ'],
  Eₒ: ['E', 'o', 'ₒ'],
  φᵥ: ['φ', 'v', 'ᵥ'],
  tᵢ: ['t', 'i', 'ᵢ'],
  pᵢ: ['p', 'i', 'ᵢ'],
  φᵢ: ['φ', 'i', 'ᵢ'],
  t_lav: ['t', 'lav', '_lav'],
  t_høj: ['t', 'høj', '_høj'],
  t_ubundet: ['t', 'ubundet', '_ubundet'],
  NÆ10: ['N', 'Æ10', 'Æ10'],
};
const identifier = /^(?:Eₒ,ækv|t_lav|t_høj|t_ubundet|NÆ10|Eᵤ|Eₒ|φᵥ|tᵢ|pᵢ|φᵢ|ln|[ftEφpk])/;
const number = /^(?:[+−-]?\d+(?:\.\d+)*(?:,\d+)?)/;

function tokenize(s: Inline): MathItem[] | null {
  const value = text(s);
  const out: MathItem[] = [];
  let depth = 0;
  let unary = true;
  for (let i = 0; i < value.length;) {
    const rest = value.slice(i);
    const style = s[i];
    const space = rest.match(/^\s+/)?.[0];
    const numeric = rest.match(number)?.[0];
    const unit = rest.match(/^(?:MPa|mm|cm|%|°)/)?.[0];
    const name = rest.match(identifier)?.[0];
    let token: MathItem;
    let size: number;
    if (space) {
      token = { ...style, kind: 'space', text: space };
      size = space.length;
    } else if (numeric && (unary || !/^[+−-]/.test(numeric))) {
      token = { ...style, kind: 'number', text: numeric };
      size = numeric.length;
      unary = false;
    } else if (unit) {
      token = { ...style, kind: 'unit', text: unit };
      size = unit.length;
      unary = false;
    } else if (name) {
      size = name.length;
      const indexed = indices[name];
      if (indexed) {
        const [base, index, suffix] = indexed;
        token = { ...style, kind: 'index', text: name, base, index, suffix };
      } else if (s[i + size]?.sub) {
        let end = i + size;
        while (s[end]?.sub) end++;
        const suffix = value.slice(i + size, end);
        token = { ...style, kind: 'index', text: name + suffix, base: name, index: suffix, suffix };
        size = end - i;
      } else token = { ...style, kind: 'identifier', text: name };
      unary = false;
    } else if (/^[+−×/=→·Σ()≈-]/.test(rest)) {
      size = 1;
      token = { ...style, kind: 'operator', text: rest[0] };
      if (rest[0] === '(') depth++;
      if (rest[0] === ')' && --depth < 0) return null;
      unary = rest[0] !== ')';
    } else return null;
    // A token crossing an emphasis boundary cannot be rendered with one MathML style.
    // Keep the whole line as text rather than silently changing that emphasis.
    if (
      s
        .slice(i, i + size)
        .some((c) => !/\s/.test(c.text) && (c.bold !== style.bold || c.weak !== style.weak))
    )
      return null;
    out.push(token);
    i += size;
  }
  return depth === 0 && out.some((t) => t.kind !== 'space') ? out : null;
}

const trimItems = (items: MathItem[]) => {
  let start = 0;
  let end = items.length;
  while (items[start]?.kind === 'space') start++;
  while (items[end - 1]?.kind === 'space') end--;
  return items.slice(start, end);
};
function unwrap(items: MathItem[]): [MathItem[], boolean] {
  if (
    items[0]?.kind !== 'operator' ||
    items[0].text !== '(' ||
    items.at(-1)?.kind !== 'operator' ||
    (items.at(-1) as Glyph).text !== ')'
  )
    return [items, false];
  let depth = 0;
  for (let i = 0; i < items.length - 1; i++) {
    const t = items[i];
    if (t.kind === 'operator') {
      if (t.text === '(') depth++;
      if (t.text === ')') depth--;
    }
    if (depth === 0) return [items, false];
  }
  return [items.slice(1, -1), true];
}

/** Only a spaced slash at depth zero in an equality term becomes a fraction. */
export function expression(s: Inline): MathItem[] | null {
  const items = tokenize(trim(s));
  if (!items) return null;
  function term(part: MathItem[]): MathItem[] {
    let depth = 0;
    const slashes: number[] = [];
    part.forEach((t, i) => {
      if (t.kind !== 'operator') return;
      if (t.text === '(') depth++;
      if (t.text === ')') depth--;
      if (
        t.text === '/' &&
        depth === 0 &&
        part[i - 1]?.kind === 'space' &&
        part[i + 1]?.kind === 'space'
      )
        slashes.push(i);
    });
    if (slashes.length !== 1) return part;
    const i = slashes[0];
    const [numerator, numeratorParens] = unwrap(trimItems(part.slice(0, i)));
    const [denominator, denominatorParens] = unwrap(trimItems(part.slice(i + 1)));
    if (!numerator.length || !denominator.length) return part;
    const leading = part[0]?.kind === 'space' ? [part[0]] : [];
    const trailing = part.at(-1)?.kind === 'space' ? [part.at(-1)!] : [];
    return [
      ...leading,
      { kind: 'fraction', numerator, denominator, numeratorParens, denominatorParens },
      ...trailing,
    ];
  }
  const out: MathItem[] = [];
  let start = 0;
  let depth = 0;
  items.forEach((t, i) => {
    if (t.kind !== 'operator') return;
    if (t.text === '(') depth++;
    if (t.text === ')') depth--;
    if (depth === 0 && /^(?:=|→|≈)$/.test(t.text)) {
      out.push(...term(items.slice(start, i)), t);
      start = i + 1;
    }
  });
  out.push(...term(items.slice(start)));
  return out;
}
export const textInline = glyphs;

function mathCell(content: Inline): Cell | null {
  const items = expression(content);
  return items ? { kind: 'math', items } : null;
}
const textCell = (content: Inline): Cell => ({ kind: 'text', content: trim(content) });

function classify(content: Inline, final: boolean, previous: string): FormulaLine {
  const s = trim(content);
  const value = text(s);
  if (!value) return { kind: 'blank' };
  const weak = s.findIndex((c) => c.weak);
  const core = trim(weak < 0 ? s : s.slice(0, weak));
  const note = weak < 0 ? [] : trim(s.slice(weak));
  const main = text(core);
  // Reduktionens label kan være længere end padEnd-bredden; slutværdien bestemmer kolonnen.
  const sum = main.match(/^([+−] )?(.+?)\s+([−+]?\d[\d.,]* (?:mm|cm))$/d);
  if (
    sum &&
    (final ||
      /^(?:ustabiliseret bærelagstykkelse|[+−] (?:basisreduktion|net-korrektion|φᵥ-korrektion|samlet reduktion|oprunding|tillæg))/.test(
        main,
      ))
  ) {
    const slice = (n: number) => {
      const range = sum.indices![n];
      return range ? trim(core.slice(...range)) : [];
    };
    return {
      kind: 'sum',
      rows: [{ sign: slice(1), label: slice(2), value: slice(3), note, final }],
    };
  }
  const header = main.match(
    /^(Eₒ\s+\d+ MPa)\s{2,}(Eₒ\s+\d+ MPa)\s{2,}(t_lav \+ f × \(t_høj − t_lav\))$/d,
  );
  const row = main.match(
    /^(ustabiliseret|[12] lag geonet)\s{2,}([−\d.,]+)\s{2,}([−\d.,]+)\s{2,}(.+)$/d,
  );
  const match = header ?? row;
  if (match && !note.length) {
    const cells: Cell[] = header ? [textCell([])] : [];
    for (let i = 1; i < match.length; i++) {
      const cell = core.slice(...match.indices![i]!);
      const translated = row && i === 1 ? textCell(cell) : mathCell(cell);
      if (!translated) return { kind: 'text', content, template: 'unknown', fallback: true };
      cells.push(translated);
    }
    return { kind: 'grid', rows: [cells] };
  }
  const label = main.match(/^(Vægtet friktionsvinkel:|Korrektionsfaktor:|Afrundet:)\s+/);
  const offset = label?.[0].length ?? 0;
  const candidate = core.slice(offset);
  if (
    /^(?:f\s*=|t\s*=|t_ubundet\s*=|Eₒ,ækv\s*=|Eₒ\s*=|φᵥ\s*=|kφ\s*=|=|≈|t_lav)/.test(text(candidate))
  ) {
    const items = expression(candidate);
    if (items)
      return { kind: 'equation', label: label ? core.slice(0, label[1].length) : [], items, note };
    // M6-afrunding er en fortsættelsesligning med en tekstnote.
    const rounded = main.match(
      /^(≈\s+[−+]?\d[\d.,]*°)\s+(\((?:nedrunding til hel grad|afrunding til nærmeste hele grad)\))$/d,
    );
    if (rounded)
      return {
        kind: 'equation',
        label: [],
        items: expression(core.slice(...rounded.indices![1]!))!,
        note: core.slice(...rounded.indices![2]!),
      };
  }
  // Tabelaflæsninger: to kolonner, ingen opfundne lighedstegn.
  const reading = main.match(/^(.*)\s{2,}([−+]?\d[\d.,]*(?: (?:mm|cm|MPa))?)$/d);
  if (
    reading &&
    /^(?:NÆ10|Eₒ|stabilgrus SG|bundsikring BL|= ubundet i alt|ustabiliseret|[12] lag geonet)/.test(
      main,
    )
  ) {
    const a = core.slice(...reading.indices![1]!);
    const b = core.slice(...reading.indices![2]!);
    return { kind: 'grid', rows: [[textCell(a), mathCell(b) ?? textCell(b)]] };
  }
  let template = 'unknown';
  if (/^T[1-6] = /.test(main)) template = 'traffic-description';
  else if (/^klasse [1-6] = /.test(main)) template = 'load-description';
  else if (
    ['traffic-description', 'load-description'].includes(previous) &&
    /^\s{4}/.test(text(content))
  )
    template = 'application';
  else if (/^kørsel T[1-6] · Eᵤ \d+ MPa$/.test(main)) template = 'direct-run';
  else if (/^uarmeret kurve ved Eᵤ = [\d.,]+ MPa:$/.test(main)) template = 'curve-heading';
  else if (
    /^aflæsning i diagrammets række for Eᵤ = [\d.,]+ MPa\s+·\s+f = [\d.,]+\s+\(jf\. trin 3\)$/.test(
      main,
    )
  )
    template = 'interpolation-heading';
  else if (/^aflæsning ved Eᵤ = [\d.,]+ MPa\s+·\s+klasse [1-6]\s+\(Eₒ [\d.,]+ MPa\)$/.test(main))
    template = 'load-heading';
  return { kind: 'text', content, template, fallback: template === 'unknown' };
}

export function formulaLayout(nodes: CouplingNode[]): FormulaLayout {
  const lines: FormulaLine[] = [];
  let previous = '';
  for (const { content, final } of inputLines(nodes)) {
    const line = classify(content, final, previous);
    previous = line.kind === 'text' ? line.template : '';
    const last = lines.at(-1);
    if (line.kind === 'sum' && last?.kind === 'sum') last.rows.push(...line.rows);
    else if (
      line.kind === 'grid' &&
      last?.kind === 'grid' &&
      line.rows[0].length === last.rows[0].length
    )
      last.rows.push(...line.rows);
    else lines.push(line);
  }
  return { lines };
}

/** Strict, non-DOM decoder for the engine's small HTML dialect. Unknown markup stays text. */
export function formulaHtmlNodes(html: string): CouplingNode[] {
  const wrapper = html.match(/^<div class="kob-formel">([\s\S]*)<\/div>$/);
  const content = wrapper?.[1] ?? html;
  if (
    !/^(?:[^<>]|<b>[^<>]*<\/b>|<sub>[^<>]*<\/sub>|<span class="kob-svag">[^<>]*<\/span>|<div class="kob-slutlinje">(?:[^<>]|<b>[^<>]*<\/b>|<span class="kob-svag">[^<>]*<\/span>)*<\/div>)*$/.test(
      content,
    )
  )
    return [html];
  function decode(s: string): CouplingNode[] {
    const out: CouplingNode[] = [];
    const tags = /<(b|sub|span|div)(?: class="(kob-svag|kob-slutlinje)")?>([\s\S]*?)<\/\1>/g;
    let start = 0;
    for (const m of s.matchAll(tags)) {
      out.push(s.slice(start, m.index));
      out.push({
        tag: m[1] as 'b' | 'sub' | 'span' | 'div',
        ...(m[2] ? { className: m[2] } : {}),
        children: decode(m[3]),
      });
      start = m.index + m[0].length;
    }
    out.push(s.slice(start));
    return out;
  }
  return decode(content);
}

/** Reconstruct from layout/tokens, including precisely the parentheses removed for mfrac. */
export function mathText(items: MathItem[]): string {
  return items
    .map((t) => {
      if (t.kind === 'fraction') {
        const n = mathText(t.numerator),
          d = mathText(t.denominator);
        return `${t.numeratorParens ? '(' + n + ')' : n} / ${t.denominatorParens ? '(' + d + ')' : d}`;
      }
      return t.kind === 'index' ? t.base + t.suffix : t.text;
    })
    .join('');
}
export function layoutText(layout: FormulaLayout): string {
  return layout.lines
    .map((line) => {
      switch (line.kind) {
        case 'blank':
          return '';
        case 'text':
          return text(line.content);
        case 'equation':
          return [text(line.label), mathText(line.items), text(line.note)]
            .filter(Boolean)
            .join(' ');
        case 'grid':
          return line.rows
            .map((row) =>
              row
                .map((cell) => (cell.kind === 'text' ? text(cell.content) : mathText(cell.items)))
                .join(' '),
            )
            .join('\n');
        case 'sum':
          return line.rows
            .map((row) =>
              [row.sign, row.label, row.value, row.note].map(text).filter(Boolean).join(' '),
            )
            .join('\n');
      }
    })
    .join('\n');
}
