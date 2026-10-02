import { createElement, Fragment } from 'react';
import type { CouplingNode } from '../../engine/kobling-explanation';
import {
  expression,
  formulaLayout,
  layoutText,
  mathText,
  splitRelation,
  type FormulaLine,
  type Inline,
  type MathItem,
} from './layout';
import './formula.css';

function InlineText({ content }: { content: Inline }) {
  // Regroup adjacent characters without changing their styles or content.
  const runs: Inline = [];
  for (const char of content) {
    const previous = runs.at(-1);
    if (
      previous &&
      previous.bold === char.bold &&
      previous.weak === char.weak &&
      previous.sub === char.sub
    )
      previous.text += char.text;
    else runs.push({ ...char });
  }
  return runs.map((run, i) => {
    let node = <Fragment>{run.text}</Fragment>;
    if (run.sub) node = <sub>{node}</sub>;
    if (run.bold) node = <b>{node}</b>;
    return (
      <span key={i} className={run.weak ? 'formula-weak' : undefined}>
        {node}
      </span>
    );
  });
}

function MathItems({ items }: { items: MathItem[] }) {
  return items.map((item, i) => {
    const key = i;
    if (item.kind === 'fraction')
      return createElement(
        'mfrac',
        { key },
        createElement('mrow', null, <MathItems items={item.numerator} />),
        createElement('mrow', null, <MathItems items={item.denominator} />),
      );
    const props = {
      key,
      className:
        [item.bold ? 'res-m' : '', item.weak ? 'formula-weak' : ''].filter(Boolean).join(' ') ||
        undefined,
    };
    switch (item.kind) {
      case 'space': {
        // MathML operators already provide spacing; add only the original gap before units.
        return items[i + 1]?.kind === 'unit'
          ? createElement('mspace', { key, width: '0.25em' })
          : null;
      }
      case 'number':
        return createElement('mn', props, item.text);
      case 'unit':
        return createElement('mtext', props, item.text);
      case 'identifier':
        return createElement(
          'mi',
          { ...props, ...(item.text === 'ln' ? { mathvariant: 'normal' } : {}) },
          item.text,
        );
      case 'operator':
        return createElement(
          'mo',
          {
            ...props,
            ...(/[()]/.test(item.text) ? { stretchy: 'false', lspace: '0', rspace: '0' } : {}),
            ...(item.text === '/' ? { lspace: '0.1em', rspace: '0.1em' } : {}),
            ...(item.text === 'Σ' ? { lspace: '0', rspace: '0.1em' } : {}),
          },
          item.text,
        );
      case 'index':
        return createElement(
          'msub',
          props,
          createElement('mi', null, item.base),
          createElement(Array.from(item.index).length === 1 ? 'mi' : 'mtext', null, item.index),
        );
    }
  });
}
function MathExpression({ items, display = false }: { items: MathItem[]; display?: boolean }) {
  return createElement(
    'math',
    { displaystyle: display ? 'true' : 'false', 'aria-label': mathText(items) },
    <MathItems items={items} />,
  );
}

/** Known prose stays in the app font; just its self-contained mathematical snippets are set. */
function AnnotatedText({ content }: { content: Inline }) {
  const value = content.map((c) => c.text).join('');
  const parts =
    /(?:E[ᵤₒ](?:\s*=)?\s+[−\d.,]+ MPa|f = [−\d.,]+|[−+]?\d[\d.,]*\s+[−+×]\s+[−+]?\d[\d.,]*(?: %)?|NÆ10|φᵥ|Eₒ)/g;
  const nodes = [];
  let start = 0;
  for (const match of value.matchAll(parts)) {
    nodes.push(<InlineText key={`t${start}`} content={content.slice(start, match.index)} />);
    const s = content.slice(match.index, match.index + match[0].length);
    const items = expression(s);
    nodes.push(
      items ? (
        <MathExpression key={`m${match.index}`} items={items} />
      ) : (
        <InlineText key={`m${match.index}`} content={s} />
      ),
    );
    start = match.index + match[0].length;
  }
  nodes.push(<InlineText key={`t${start}`} content={content.slice(start)} />);
  return nodes;
}

type EquationLine = Extract<FormulaLine, { kind: 'equation' }>;

export function FormulaBlock({ nodes }: { nodes: CouplingNode[] }) {
  const layout = formulaLayout(nodes);
  // B-072: på hinanden følgende ligninger deler gitter, så lighedstegnene står under hinanden.
  const groups: (FormulaLine | { kind: 'equations'; rows: EquationLine[] })[] = [];
  for (const line of layout.lines) {
    const last = groups.at(-1);
    if (line.kind !== 'equation') groups.push(line);
    else if (last?.kind === 'equations') last.rows.push(line);
    else groups.push({ kind: 'equations', rows: [line] });
  }
  return (
    <div className="kob-formel formula-block" tabIndex={0} data-formula-text={layoutText(layout)}>
      <div className="formula-content">
        {groups.map((line, i) => {
          switch (line.kind) {
            case 'blank':
              return <div key={i} className="formula-blank" />;
            case 'text':
              return (
                <div
                  key={i}
                  className="formula-text"
                  data-formula-fallback={line.fallback || undefined}
                >
                  {line.fallback ? (
                    <InlineText content={line.content} />
                  ) : (
                    <AnnotatedText content={line.content} />
                  )}
                </div>
              );
            case 'equations':
              return (
                <div key={i} className="formula-equations">
                  {line.rows.map((row, r) => {
                    const [lhs, rhs] = splitRelation(row.items);
                    return (
                      <div key={r} className="formula-equation">
                        <span className="formula-label">
                          <InlineText content={row.label} />
                        </span>
                        <span className="formula-lhs">
                          {lhs.length > 0 && <MathExpression items={lhs} display />}
                        </span>
                        <span className="formula-rhs">
                          {rhs.length > 0 && <MathExpression items={rhs} display />}
                          {row.note.length > 0 && (
                            <span className="formula-weak formula-note">
                              {' '}
                              <AnnotatedText content={row.note} />
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            case 'equation':
              return null;
            case 'grid':
              return (
                <div
                  key={i}
                  className="formula-grid"
                  style={{
                    gridTemplateColumns: `repeat(${line.rows[0].length - 1}, max-content) minmax(max-content, 1fr)`,
                  }}
                >
                  {line.rows.flatMap((row, r) =>
                    row.map((cell, c) => (
                      <span
                        key={`${r}-${c}`}
                        className={
                          c > 0 && (row.length === 2 || c < row.length - 1)
                            ? 'formula-number'
                            : undefined
                        }
                      >
                        {cell.kind === 'math' ? (
                          <MathExpression items={cell.items} display />
                        ) : (
                          <AnnotatedText content={cell.content} />
                        )}
                      </span>
                    )),
                  )}
                </div>
              );
            case 'sum':
              return (
                <div key={i} className="formula-sum">
                  {line.rows.map((row, r) => (
                    <div key={r} className={`formula-sum-row${row.final ? ' kob-slutlinje' : ''}`}>
                      <span>
                        <InlineText content={row.sign} />
                      </span>
                      <span>
                        <AnnotatedText content={row.label} />
                      </span>
                      <span className="formula-number">
                        <InlineText content={row.value} />
                      </span>
                      <span className="formula-weak">
                        <AnnotatedText content={row.note} />
                      </span>
                    </div>
                  ))}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
