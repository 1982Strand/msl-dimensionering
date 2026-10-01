import { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import { resultChecks, type CheckNode, type CheckElement } from '../engine/result-checks';
import type { DimensioningInput, dimensioner } from '../engine/dimensionering';
import type { ProductRow } from '../engine/products';
import { Notice } from './Notice';
import './result-checks.css';

type Props = {
  input: DimensioningInput;
  result: ReturnType<typeof dimensioner>;
  unit: string;
  products?: { one: ProductRow[]; two: ProductRow[] };
};
function Content({ nodes }: { nodes: CheckNode[] }) {
  return nodes.map((node, i) => {
    if (typeof node === 'string') return <Fragment key={i}>{node}</Fragment>;
    const Tag = node.tag;
    // Original's inline styles are kept in the model for exact reference testing.
    // Theme and app font are applied by this component's stylesheet.
    return (
      <Tag key={i} className={node.className} title={node.title} aria-label={node.ariaLabel}>
        <Content nodes={node.children} />
      </Tag>
    );
  });
}
function Element({ element }: { element: CheckElement }) {
  if (element.type === 'html') {
    const outer = element.nodes[0];
    const message = typeof outer !== 'string' && outer.style;
    const warning = message && outer.style?.startsWith('background:#FCF5E8');
    if (!message)
      return (
        <div>
          <Content nodes={element.nodes} />
        </div>
      );
    return (
      <Notice
        kind={warning ? 'warning' : 'info'}
        className={`result-check-message ${warning ? 'result-check-warning' : 'result-check-info'}`}
      >
        <Content nodes={element.nodes} />
      </Notice>
    );
  }
  if (element.type === 'warning') return <Notice kind="warning">{element.body}</Notice>;
  return (
    <div
      className={
        element.element_type === 'CAPTION' ? 'result-check-caption' : 'result-check-markdown'
      }
    >
      <ReactMarkdown>{element.body}</ReactMarkdown>
    </div>
  );
}

/** Original's status-slot immediately after the result cards. */
export function ResultStatus(props: Props) {
  const model = resultChecks(props.input, props.result, props.unit, props.products);
  return (
    <>
      {model.outsideMessages.map((element, i) => (
        <Element key={i} element={element} />
      ))}
      {model.status && <Element element={model.status} />}
    </>
  );
}

export function ResultChecks(props: Props) {
  const model = resultChecks(props.input, props.result, props.unit, props.products);
  if (!model.expanders.length) return null;
  return (
    <div className="result-checks">
      {model.expanders.map((expander, i) => (
        <Accordion key={i} type="single" collapsible className="dim-expander-card">
          <AccordionItem value={String(i)}>
            <AccordionTrigger>{expander.label}</AccordionTrigger>
            <AccordionContent className="result-check-content">
              {expander.children.map((element, j) => (
                <Element key={j} element={element} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}
