import { useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { CouplingFigureModel } from '../engine/kobling-figures';
import {
  COUPLING_SVG_SIZE,
  couplingSvgScales,
  renderCouplingFigureSvg,
} from '../engine/kobling-figures-svg';
import { TEMA } from '../engine/personal-diagram-svg';
import { laengde } from '../engine/enhed';
import { pythonFixed } from '../engine/python-numbers';

type Active = { curve: number; point: number } | { marker: number };
function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax,
    dy = by - ay;
  const t =
    dx || dy
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
      : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

export function CouplingFigure({ model: m }: { model: CouplingFigureModel }) {
  const id = useId();
  const uid = `kobling-${id.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const svg = useMemo(
    () => renderCouplingFigureSvg(m, { idPrefix: uid, showLegend: false }),
    [m, uid],
  );
  // Reset interaction when the model changes, including an input update while hovering.
  return <FigureCanvas key={svg} m={m} svg={svg} uid={uid} />;
}

function FigureCanvas({ m, svg, uid }: { m: CouplingFigureModel; svg: string; uid: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Active | null>(null);
  const { pl, sx, sy } = useMemo(() => couplingSvgScales(m), [m]);
  const curves = useMemo(
    () => m.curves.map((c) => c.points.map(([x, y]) => [sx(x), sy(y)])),
    [m, sx, sy],
  );
  const find = (px: number, py: number): Active | null => {
    let marker = -1,
      distance = Infinity;
    m.points.forEach((p, i) => {
      const d = Math.hypot(px - sx(p.x), py - sy(p.y));
      if (d <= 14 && d < distance) {
        distance = d;
        marker = i;
      }
    });
    if (marker >= 0) return { marker };
    let curve = -1;
    distance = Infinity;
    curves.forEach((c, i) => {
      for (let j = 1; j < c.length; j++) {
        const d = segmentDistance(px, py, c[j - 1][0], c[j - 1][1], c[j][0], c[j][1]);
        if (d < distance) {
          distance = d;
          curve = i;
        }
      }
    });
    if (curve < 0 || distance > 16) return null;
    const c = curves[curve];
    const point = c.reduce(
      (best, [x, y], i) =>
        Math.hypot(px - x, py - y) < Math.hypot(px - c[best][0], py - c[best][1]) ? i : best,
      0,
    );
    return { curve, point };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const rect = box.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * COUPLING_SVG_SIZE.width;
    const py = ((e.clientY - rect.top) / rect.height) * COUPLING_SVG_SIZE.height;
    setActive(
      px < pl.x0 - 8 || px > pl.x1 + 8 || py < pl.y0 - 8 || py > pl.y1 + 8 ? null : find(px, py),
    );
  };
  const keyboard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setActive(null);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const indices = m.curves.flatMap((c, i) => (c.points.length >= 2 ? [i] : []));
    if (!indices.length) return;
    setActive((a) => {
      if (!a || !('curve' in a))
        return { curve: indices[0], point: Math.floor(m.curves[indices[0]].points.length / 2) };
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown')
        return {
          curve: a.curve,
          point: Math.max(
            0,
            Math.min(m.curves[a.curve].points.length - 1, a.point + (e.key === 'ArrowUp' ? 1 : -1)),
          ),
        };
      const curve =
        indices[
          (indices.indexOf(a.curve) + (e.key === 'ArrowRight' ? 1 : indices.length - 1)) %
            indices.length
        ];
      const eu = m.curves[a.curve].points[a.point][1],
        pts = m.curves[curve].points;
      return {
        curve,
        point: pts.reduce(
          (best, p, i) => (Math.abs(p[1] - eu) < Math.abs(pts[best][1] - eu) ? i : best),
          0,
        ),
      };
    });
  };
  const curve = active && 'curve' in active ? m.curves[active.curve] : null;
  const pair = active && 'curve' in active ? curve?.points[active.point] : null;
  const selected =
    active && 'marker' in active
      ? m.points[active.marker]
      : curve && pair
        ? { x: pair[0], y: pair[1], name: curve.name, role: curve.role, hollow: false }
        : null;
  const color = selected ? TEMA.serie[selected.role] : TEMA.serie.neutral;
  const px = selected ? sx(selected.x) : 0,
    py = selected ? sy(selected.y) : 0;
  // SVG tooltip has a fixed box, clamped on all four sides; scales with the figure.
  const tw = 194,
    th = 62;
  const tx = Math.max(
    4,
    Math.min(
      COUPLING_SVG_SIZE.width - tw - 4,
      px > pl.x0 + (pl.x1 - pl.x0) * 0.62 ? px - tw - 18 : px + 18,
    ),
  );
  const ty = Math.max(4, Math.min(COUPLING_SVG_SIZE.height - th - 4, py - th - 14));
  return (
    <div
      className="coupling-canvas"
      ref={box}
      tabIndex={0}
      role="group"
      aria-label={`${m.title}. Brug piletasterne for at aflæse punkter på kurverne.`}
      onPointerMove={move}
      onPointerLeave={() => setActive(null)}
      onKeyDown={keyboard}
      onBlur={() => setActive(null)}
    >
      <div className="coupling-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      {selected && (
        <svg
          className="coupling-overlay"
          viewBox={`0 0 ${COUPLING_SVG_SIZE.width} ${COUPLING_SVG_SIZE.height}`}
        >
          <defs>
            <clipPath id={`${uid}-hover-plot`}>
              <rect x={pl.x0} y={pl.y0} width={pl.x1 - pl.x0} height={pl.y1 - pl.y0} />
            </clipPath>
          </defs>
          <g aria-hidden="true" clipPath={`url(#${uid}-hover-plot)`}>
            {curve && (
              <path
                d={curve.points.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x)} ${sy(y)}`).join('')}
                fill="none"
                stroke={color}
                strokeWidth="3.5"
                strokeDasharray={curve.dashed ? '4 3' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <circle cx={px} cy={py} r="13" fill={color} opacity="0.16" />
            <circle cx={px} cy={py} r="8" fill="#fff" stroke={color} strokeWidth="2" />
            <circle
              cx={px}
              cy={py}
              r="4.5"
              fill={selected.hollow ? '#fff' : color}
              stroke={color}
              strokeWidth={selected.hollow ? 2 : 0}
            />
          </g>
          <g role="status" className="coupling-tooltip" transform={`translate(${tx} ${ty})`}>
            <rect width={tw} height={th} rx="8" fill="#fff" stroke={TEMA.akse} />
            <line
              x1="10"
              y1="17"
              x2="26"
              y2="17"
              stroke={color}
              strokeWidth="2"
              strokeDasharray={curve?.dashed ? '4 3' : undefined}
            />
            <text x="34" y="21" fontSize="12" fontWeight="600" fill={TEMA.tekst}>
              {laengde(selected.x, m.unit)}
            </text>
            <text x="10" y="38" fontSize="11" fill={TEMA.tekst2}>
              {selected.name}
            </text>
            <text x="10" y="53" fontSize="11" fill={TEMA.tekst2}>
              Eᵤ {pythonFixed(selected.y, 1).replace('.', ',')} MPa
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}
