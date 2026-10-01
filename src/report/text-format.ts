/** B-046: lille tekstsyntaks; resultatet er data, aldrig Typst-kilde. */
export interface TextPiece {
  text: string;
  bold: boolean;
  italic: boolean;
}
export interface FormattedLine {
  kind: 'line' | 'bullet';
  indent: string;
  depth: number;
  marker: string | null;
  pieces: TextPiece[];
}
export interface FormattedText {
  paragraphs: { lines: FormattedLine[] }[];
}

/** Kun hele *-par med ikke-tomt indhold. Ugyldige/åbne par bevares bogstaveligt. */
export function parseTextPieces(source: string): TextPiece[] {
  function parse(s: string, bold = false, italic = false, strict = false): TextPiece[] | null {
    const pieces: TextPiece[] = [];
    const append = (text: string) => {
      if (!text) return;
      const last = pieces.at(-1);
      if (last && last.bold === bold && last.italic === italic) last.text += text;
      else pieces.push({ text, bold, italic });
    };
    let pos = 0;
    while (pos < s.length) {
      const start = s.indexOf('*', pos);
      if (start < 0) {
        append(s.slice(pos));
        break;
      }
      append(s.slice(pos, start));
      const run = s.slice(start).match(/^\*+/)![0];
      if (run.length > 2) {
        append(run);
        pos = start + run.length;
        continue;
      }
      let end = start + run.length;
      while (end < s.length) {
        const next = s.indexOf('*', end);
        if (next < 0) {
          end = s.length;
          break;
        }
        const closing = s.slice(next).match(/^\*+/)![0];
        if (closing === run) {
          end = next;
          break;
        }
        end = next + closing.length;
      }
      if (end >= s.length || end === start + run.length) {
        if (strict) return null;
        append(s.slice(start));
        break;
      }
      const inner = parse(
        s.slice(start + run.length, end),
        bold || run === '**',
        italic || run === '*',
        true,
      );
      if (!inner) {
        if (strict) return null;
        append(s.slice(start, end + run.length));
      } else pieces.push(...inner);
      pos = end + run.length;
    }
    return pieces;
  }
  return parse(source) ?? [{ text: source, bold: false, italic: false }];
}

const indentWidth = (indent: string) =>
  [...indent].reduce((width, ch) => (ch === '\t' ? width + 36 - (width % 36) : width + 2.49), 0);

export function parseReportText(source: string): FormattedText {
  if (source === '') return { paragraphs: [] };
  return {
    paragraphs: source.split('\n\n').map((paragraph) => {
      const levels: number[] = [];
      return {
        lines: paragraph.split('\n').map((raw) => {
          const indent = raw.match(/^[ \t]*/)![0];
          const body = raw.slice(indent.length);
          const width = indentWidth(indent);
          const bullet =
            body.match(/^([•-]) (.*)$/) ??
            (levels.length && width > levels[0] ? body.match(/^(o) (.*)$/) : null);
          if (!bullet)
            return {
              kind: 'line' as const,
              indent,
              depth: 0,
              marker: null,
              pieces: parseTextPieces(body),
            };
          while (levels.length && width < levels.at(-1)!) levels.pop();
          if (!levels.length || width > levels.at(-1)!) levels.push(width);
          return {
            kind: 'bullet' as const,
            indent,
            depth: levels.length - 1,
            marker: bullet[1],
            pieces: parseTextPieces(bullet[2]),
          };
        }),
      };
    }),
  };
}

export type TextFormatAction = 'bold' | 'italic' | 'bullet';
/** Returnerer også markeringen, så editoren kan bevare fokus og det valgte indhold. */
export function formatTextSelection(
  value: string,
  start: number,
  end: number,
  action: TextFormatAction,
) {
  if (action !== 'bullet') {
    const marker = action === 'bold' ? '**' : '*';
    return {
      value: value.slice(0, start) + marker + value.slice(start, end) + marker + value.slice(end),
      start: start + marker.length,
      end: end + marker.length,
    };
  }
  const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  const lastSelected = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const next = value.indexOf('\n', lastSelected);
  const to = next < 0 ? value.length : next;
  const selected = value.slice(from, to);
  const insertions: number[] = [];
  let offset = from;
  const replacement = selected
    .split('\n')
    .map((line) => {
      const indent = line.match(/^[ \t]*/)![0];
      insertions.push(offset + indent.length);
      offset += line.length + 1;
      return indent + '• ' + line.slice(indent.length);
    })
    .join('\n');
  return {
    value: value.slice(0, from) + replacement + value.slice(to),
    start: start + 2 * insertions.filter((p) => p <= start).length,
    end: end + 2 * insertions.filter((p) => p <= lastSelected).length,
  };
}
