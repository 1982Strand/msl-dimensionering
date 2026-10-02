import { Fragment } from 'react';
import './coupling.css';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import { koblingExplanation, type CouplingNode } from '../engine/kobling-explanation';
import type { DimensioningInput, dimensioner } from '../engine/dimensionering';
import { CouplingFigure } from './CouplingFigure';
import { FormulaBlock } from './formula/FormulaBlock';

function Content({ nodes }: { nodes: CouplingNode[] }) {
  return nodes.map((n, i) => {
    if (typeof n === 'string') return <Fragment key={i}>{n}</Fragment>;
    if (n.className?.split(' ').includes('kob-formel')) {
      return <FormulaBlock key={i} nodes={n.children} />;
    }
    const Tag = n.tag;
    return (
      <Tag key={i} className={n.className}>
        {Tag === 'br' ? undefined : <Content nodes={n.children} />}
      </Tag>
    );
  });
}

export function CouplingExplanation({
  input,
  result,
}: {
  input: DimensioningInput;
  result: ReturnType<typeof dimensioner>;
}) {
  const explanation = koblingExplanation(input, result);
  if (!explanation.visible) return null;
  const title = explanation.title!.split('**');
  return (
    <Accordion type="single" collapsible className="section-card coupling-explanation">
      <AccordionItem value="calculation">
        <AccordionTrigger className="coupling-trigger">
          <span>
            {title.length > 1 ? (
              <>
                <strong>{title[1]}</strong>
                <span className="coupling-subtitle">{title[2]}</span>
              </>
            ) : (
              <strong>{title[0]}</strong>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="coupling-content">
          <div className="kob">
            {explanation.captions.map((caption, i) => (
              <p key={i} className="kob-note">
                {caption}
              </p>
            ))}
            {explanation.steps.map((step, i) => (
              <Fragment key={step.number}>
                {i > 0 && <div className="kob-skel" />}
                <section
                  key={step.number}
                  className="kob-step"
                  aria-label={`Trin ${step.number}: ${step.title}`}
                >
                  <div className="kob-trin">
                    <span className="kob-nr">{step.number}</span>
                    <div>
                      <h3 className="kob-titel">{step.title}</h3>{' '}
                      <span className="kob-kilde">— {step.source}</span>
                      {step.chip && <span className="kob-chip">{step.chip}</span>}
                    </div>
                    <div className="kob-res">
                      <div className={`kob-res-tal${step.green ? ' kob-groen' : ''}`}>
                        {step.result.split(' / ').map((part, i) => (
                          <Fragment key={i}>
                            {i > 0 && (
                              <>
                                {' '}
                                <span className="kob-skraa">/</span>{' '}
                              </>
                            )}
                            {part}
                          </Fragment>
                        ))}
                      </div>
                      <div className={`kob-res-note${step.monoNote ? ' kob-groen' : ''}`}>
                        {step.result_note}
                      </div>
                    </div>
                  </div>
                  <div className="kob-krop">
                    <div className={step.figure?.model ? 'kob-kol' : 'kob-venstre'}>
                      <div className="kob-venstre">
                        <Content nodes={step.body} />
                      </div>
                      {step.figure?.model && (
                        <figure className="kob-figur">
                          <CouplingFigure model={step.figure.model} />
                          <div className="kob-sign">
                            {step.figure.model.legend.map((entry, i) => (
                              <div key={i}>
                                <span
                                  className={`${entry.hollow ? 'kob-prik-ring' : 'kob-prik'} kob-sign-${entry.role}`}
                                  aria-hidden="true"
                                />
                                {entry.text}
                              </div>
                            ))}
                          </div>
                          <figcaption className="kob-figur-tekst">{step.figure.caption}</figcaption>
                        </figure>
                      )}
                    </div>
                  </div>
                </section>
              </Fragment>
            ))}
            {explanation.footer && <p className="kob-fod">{explanation.footer}</p>}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
