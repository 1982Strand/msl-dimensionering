import { Fragment } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import { Hint } from './Hint';
import { netDetails, netIntervalNote, type NetDetailsNode } from '../engine/net-details';
import type { DimensioningInput, dimensioner } from '../engine/dimensionering';
import type { ProductRow } from '../engine/products';
import './NetDetails.css';

function Content({ node }: { node: NetDetailsNode }) {
  if (typeof node === 'string') return <>{node}</>;
  const Tag = node.tag;
  const children = node.children.map((child, i) => (
    <Fragment key={i}>
      <Content node={child} />
    </Fragment>
  ));
  if (node.title)
    return (
      <Hint content={node.title}>
        <Tag className={node.className} tabIndex={0}>
          {children}
        </Tag>
      </Hint>
    );
  return <Tag className={node.className}>{children}</Tag>;
}

const text = (node: NetDetailsNode): string =>
  typeof node === 'string' ? node : node.children.map(text).join('');

export function NetIntervalNote({ result }: { result: ReturnType<typeof dimensioner> }) {
  const note = netIntervalNote(result);
  return note ? <Content node={note} /> : null;
}

export function NetDetails({
  input,
  result,
  products,
}: {
  input: DimensioningInput;
  result: ReturnType<typeof dimensioner>;
  products: { one: ProductRow[]; two: ProductRow[] };
}) {
  const model = netDetails(input, result, products);
  if (!model.heading || !model.grid) return null;
  // Modellens hoved (titel og note) bliver udfoldningens overskrift; tekst og indhold er uændrede.
  const [title, note] =
    typeof model.heading === 'string' ? [model.heading] : model.heading.children.map(text);
  return (
    <Accordion type="single" collapsible className="dim-expander-card net-details">
      <AccordionItem value="details">
        <AccordionTrigger className="net-details-trigger">
          <span>
            <strong>{title}</strong>
            {note && <span className="net-details-subtitle"> · {note}</span>}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Content node={model.grid} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
