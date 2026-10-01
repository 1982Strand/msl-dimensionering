import { Fragment } from 'react';
import { Hint } from './Hint';
import {
  thinnestTitle,
  type DimensioningPage,
  type PageDisplayNode,
} from '../engine/dimensioning-page';

function Nodes({ nodes }: { nodes: PageDisplayNode[] }) {
  return nodes.map((node, i) => {
    if (typeof node === 'string') return <Fragment key={i}>{node}</Fragment>;
    if ('text' in node) return <Fragment key={i}>{node.text}</Fragment>;
    // The original inline styles are reference metadata. Theme and typography live in CSS.
    if (node.className === 'bg-trin-hoved')
      return (
        <div key={i} className={node.className}>
          <h2>
            <Nodes nodes={[node.children[0]]} /> <Nodes nodes={[node.children[1]]} />
          </h2>
          <Nodes nodes={node.children.slice(2)} />
        </div>
      );
    const Tag =
      node.className === 'bg-trin-nr' || node.className === 'bg-trin-titel'
        ? 'span'
        : ['bg-resultat-titel', 'bg-kort-titel'].includes(node.className ?? '') ||
            (node.className === 't' &&
              typeof node.children[0] === 'string' &&
              ['Vælg geonet', 'Designdiagram'].includes(node.children[0]))
          ? 'h2'
          : node.tag;
    const title = node.attributes?.title;
    const element = (
      <Tag
        className={title ? [node.className, 'hint-text'].filter(Boolean).join(' ') : node.className}
        tabIndex={title ? 0 : undefined}
      >
        {Tag === 'table' ? (
          <tbody>
            <Nodes nodes={node.children} />
          </tbody>
        ) : (
          <Nodes nodes={node.children} />
        )}
      </Tag>
    );
    // B-065: originalens title-forklaring vises som Hover Card.
    return title ? (
      <Hint key={i} content={title}>
        {element}
      </Hint>
    ) : (
      <Fragment key={i}>{element}</Fragment>
    );
  });
}

export function PageContent({
  model,
  slot,
  bare = false,
}: {
  model: DimensioningPage;
  slot: string;
  /** Uden data-m9-slot, fx en synlig kopi i et Hover Card af et skjult element. */
  bare?: boolean;
}) {
  const element = model.elements.find((e) => e.slot === slot);
  if (!element) return null;
  return (
    <div data-m9-slot={bare ? undefined : slot}>
      <Nodes nodes={element.content} />
    </div>
  );
}

export function PageResultCards({ model }: { model: DimensioningPage }) {
  if (!model.cards.length) return null;
  return (
    <div className="dim-results m9-result-cards" aria-label="Beregnet bærelagstykkelse">
      {model.cards.map((card) => (
        <div key={card.label} className={card.highlighted ? 'm9-thinnest' : undefined}>
          <div className="m9-result-label">
            <h3>{card.label}</h3>
            {card.highlighted && (
              <Hint content={thinnestTitle}>
                <span className="m9-badge" tabIndex={0}>
                  TYNDEST
                </span>
              </Hint>
            )}
          </div>
          <div className="m9-result-value">
            <strong>
              {card.value} {card.unit}
            </strong>
            {card.calculated && <span>({card.calculated})</span>}
          </div>
          {card.delta !== null ? (
            <p className="m9-result-delta">
              <b>{card.delta}</b> <span>{card.deltaNote}</span>
            </p>
          ) : (
            <p>{card.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}
