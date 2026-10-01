import { Fragment } from 'react';
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
    return (
      <Tag key={i} className={node.className} title={node.attributes?.title}>
        {Tag === 'table' ? (
          <tbody>
            <Nodes nodes={node.children} />
          </tbody>
        ) : (
          <Nodes nodes={node.children} />
        )}
      </Tag>
    );
  });
}

export function PageContent({ model, slot }: { model: DimensioningPage; slot: string }) {
  const element = model.elements.find((e) => e.slot === slot);
  if (!element) return null;
  return (
    <div data-m9-slot={slot}>
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
              <span className="m9-badge" title={thinnestTitle}>
                TYNDEST
              </span>
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
