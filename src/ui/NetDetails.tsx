import { Fragment } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { netDetails, netIntervalNote, type NetDetailsNode } from '../engine/net-details';
import type { DimensioningInput, dimensioner } from '../engine/dimensionering';
import type { ProductRow } from '../engine/products';
import './NetDetails.css';

function Content({ node }: { node: NetDetailsNode }) {
  if (typeof node === 'string') return <>{node}</>;
  const Tag = node.className === 'bg-kort-titel' ? 'h2' : node.tag;
  const children = node.children.map((child, i) => (
    <Fragment key={i}>
      <Content node={child} />
    </Fragment>
  ));
  if (node.title)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Tag className={node.className} tabIndex={0}>
            {children}
          </Tag>
        </TooltipTrigger>
        <TooltipContent className="net-details-tooltip" sideOffset={6}>
          {node.title}
        </TooltipContent>
      </Tooltip>
    );
  return <Tag className={node.className}>{children}</Tag>;
}

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
  return (
    <section
      className="section-card settings-card net-details"
      aria-label={`Detaljer · ${result!.geonet_navn}`}
    >
      <Content node={model.heading} />
      <TooltipProvider>
        <Content node={model.grid} />
      </TooltipProvider>
    </section>
  );
}
