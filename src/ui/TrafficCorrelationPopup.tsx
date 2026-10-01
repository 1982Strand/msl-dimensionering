import ReactMarkdown from 'react-markdown';
import type { DimensioningInput } from '../engine/dimensionering';
import { trafficPopover } from '../engine/traffic-popover';
import { InfoPopup } from './InfoPopup';
import './TrafficCorrelationPopup.css';

export function TrafficCorrelationPopup({ input }: { input: DimensioningInput }) {
  const model = trafficPopover(input);
  if (!model) return null;
  const [intro, table, caption] = model.children;
  return (
    <InfoPopup label={model.label} title={model.label} wide>
      <div className="traffic-correlation-popup">
        <ReactMarkdown>{intro.body}</ReactMarkdown>
        <div className="traffic-correlation-scroll">
          <table aria-label="Trafikklasse-korrelation">
            <thead>
              <tr>
                <th scope="col">Trafikklasse</th>
                {table.columns.map((c) => (
                  <th scope="col" key={c}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((cells, r) => (
                <tr
                  key={table.index[r]}
                  data-active-row={r === table.activeRow ? 'true' : undefined}
                >
                  <th scope="row">{table.index[r]}</th>
                  {cells.map((cell, c) => (
                    <td
                      key={table.columns[c]}
                      className={`traffic-correlation-${table.styles[r][c]}`}
                      aria-current={table.styles[r][c] === 'cell' ? 'true' : undefined}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="traffic-correlation-caption">
          <ReactMarkdown>{caption.body}</ReactMarkdown>
        </div>
      </div>
    </InfoPopup>
  );
}
