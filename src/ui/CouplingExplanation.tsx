import { Fragment } from 'react';
import { koblingExplanation, type CouplingNode } from '../engine/kobling-explanation';
import type { DimensioningInput, dimensioner } from '../engine/dimensionering';

function Content({ nodes }: { nodes: CouplingNode[] }) {
  return nodes.map((n, i) => {
    if (typeof n === 'string') return <Fragment key={i}>{n}</Fragment>;
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
    <details className="section-card settings-deviations coupling-explanation">
      <summary>
        {title.length > 1 ? (
          <>
            <strong>{title[1]}</strong>
            {title[2]}
          </>
        ) : (
          title[0]
        )}
      </summary>
      <div className="coupling-content">
        {explanation.captions.map((caption, i) => (
          <p key={i} className="settings-note">
            {caption}
          </p>
        ))}
        {explanation.steps.map((step) => (
          <section
            key={step.number}
            className="coupling-step"
            aria-label={`Trin ${step.number}: ${step.title}`}
          >
            <div className="coupling-heading">
              <span className="coupling-number">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p className="settings-note">— {step.source}</p>
                {step.chip && <span className="coupling-chip">{step.chip}</span>}
              </div>
              <div className={`coupling-result${step.green ? ' coupling-green' : ''}`}>
                <strong>{step.result}</strong>
                <small className={step.monoNote ? 'coupling-mono' : undefined}>
                  {step.result_note}
                </small>
              </div>
            </div>
            <div className={step.figure ? 'coupling-columns' : undefined}>
              <div className="coupling-body">
                <Content nodes={step.body} />
              </div>
              {step.figure && (
                <figure className="coupling-figure">
                  <div className="coupling-placeholder">Figur følger</div>
                  <ul>
                    {step.figure.legend.map((entry, i) => (
                      <li key={i}>{entry}</li>
                    ))}
                  </ul>
                  <figcaption>{step.figure.caption}</figcaption>
                </figure>
              )}
            </div>
          </section>
        ))}
        {explanation.footer && <p className="coupling-footer">{explanation.footer}</p>}
      </div>
    </details>
  );
}
