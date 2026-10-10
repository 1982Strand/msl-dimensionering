import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import {
  svgScales,
  SVG_SIZE,
  TEMA,
  dk,
  type DiagramSize,
  type PersonalDiagramModel,
} from '../engine/personal-diagram-svg';
import './PersonalDiagram.css';

type Active = { li: number; pi: number } | { punkt: number };

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax,
    dy = by - ay;
  const t =
    dx || dy
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
      : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export interface DiagramTooltipFormat {
  xText: (x: number) => string;
  euText: (y: number) => string;
}
const defaultTooltip: DiagramTooltipFormat = {
  xText: (x) => `${dk(x)} cm`,
  euText: (y) => `Eᵤ ${dk(y, 1)} MPa`,
};
export function DiagramCanvas({
  m,
  svg,
  uid,
  size = SVG_SIZE,
  tooltipFormat = defaultTooltip,
  ariaLabel = 'Designdiagram. Brug piletasterne for at aflæse punkter på kurverne.',
  flipAt = 0.62,
}: {
  m: PersonalDiagramModel;
  svg: string;
  uid: string;
  size?: DiagramSize;
  tooltipFormat?: DiagramTooltipFormat;
  ariaLabel?: string;
  /** Andel af plotbredden, hvorfra kortet står til venstre for punktet (smalle diagrammer: lavere). */
  flipAt?: number;
}) {
  const boks = useRef<HTMLDivElement>(null);
  const [aktiv, setAktiv] = useState<Active | null>(null);
  useEffect(() => setAktiv(null), [m]);
  const { pl, sx, sy } = useMemo(() => svgScales(m, size), [m, size]);
  const kurver = useMemo(
    () => m.linjer.map((l) => l.pts.map(([x, y]) => [sx(x), sy(y)])),
    [m, sx, sy],
  );

  const find = (px: number, py: number): Active | null => {
    let punkt = -1,
      punktD = Infinity;
    m.punkter.forEach((p, i) => {
      const d = Math.hypot(px - sx(p.x), py - sy(p.y));
      if (d <= 14 && d < punktD) {
        punktD = d;
        punkt = i;
      }
    });
    if (punkt >= 0) return { punkt };
    let li = -1,
      dMin = Infinity;
    kurver.forEach((k, i) => {
      // En enkelt gyldig koordinat er også en aflæselig kurve.
      if (k.length === 1) {
        const d = Math.hypot(px - k[0][0], py - k[0][1]);
        if (d < dMin) {
          dMin = d;
          li = i;
        }
      }
      for (let j = 1; j < k.length; j++) {
        const d = segmentDistance(px, py, k[j - 1][0], k[j - 1][1], k[j][0], k[j][1]);
        if (d < dMin) {
          dMin = d;
          li = i;
        }
      }
    });
    if (li < 0 || dMin > 16) return null;
    const k = kurver[li];
    const pi = k.reduce(
      (best, [x, y], i) =>
        Math.hypot(px - x, py - y) < Math.hypot(px - k[best][0], py - k[best][1]) ? i : best,
      0,
    );
    return { li, pi };
  };
  const flyt = (e: PointerEvent<HTMLDivElement>) => {
    const r = boks.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * size.width;
    const py = ((e.clientY - r.top) / r.height) * size.height;
    setAktiv(
      px < pl.x0 - 8 || px > pl.x1 + 8 || py < pl.y0 - 8 || py > pl.y1 + 8 ? null : find(px, py),
    );
  };
  const tast = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setAktiv(null);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const indices = m.linjer.flatMap((l, i) => (l.pts.length ? [i] : []));
    if (!indices.length) return;
    setAktiv((a) => {
      const nu = a && 'li' in a && m.linjer[a.li]?.pts[a.pi] ? a : null;
      if (!nu) return { li: indices[0], pi: Math.floor(m.linjer[indices[0]].pts.length / 2) };
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        return {
          li: nu.li,
          pi: Math.max(
            0,
            Math.min(m.linjer[nu.li].pts.length - 1, nu.pi + (e.key === 'ArrowUp' ? 1 : -1)),
          ),
        };
      }
      const index =
        (indices.indexOf(nu.li) + (e.key === 'ArrowRight' ? 1 : indices.length - 1)) %
        indices.length;
      const li = indices[index],
        eu = m.linjer[nu.li].pts[nu.pi][1],
        pts = m.linjer[li].pts;
      const pi = pts.reduce(
        (b, p, j) => (Math.abs(p[1] - eu) < Math.abs(pts[b][1] - eu) ? j : b),
        0,
      );
      return { li, pi };
    });
  };
  const curve = aktiv && 'li' in aktiv ? m.linjer[aktiv.li] : null;
  const pair = aktiv && 'li' in aktiv ? curve?.pts[aktiv.pi] : null;
  const point = aktiv && 'punkt' in aktiv ? m.punkter[aktiv.punkt] : null;
  const valgt = point
    ? { ...point, optimal: point.hul }
    : curve && pair
      ? { ...curve, x: pair[0], y: pair[1] }
      : null;
  const farve = valgt ? TEMA.serie[valgt.rolle] : TEMA.serie.neutral;
  const hoejreSide = valgt && sx(valgt.x) > pl.x0 + (pl.x1 - pl.x0) * flipAt;
  return (
    <div
      className="personal-diagram-canvas"
      ref={boks}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
      onPointerMove={flyt}
      onPointerLeave={() => setAktiv(null)}
      onKeyDown={tast}
      onBlur={() => setAktiv(null)}
    >
      <div className="personal-diagram-base" dangerouslySetInnerHTML={{ __html: svg }} />
      {valgt && (
        <>
          <svg
            className="personal-diagram-overlay"
            viewBox={`0 0 ${size.width} ${size.height}`}
            aria-hidden="true"
          >
            <defs>
              <clipPath id={`${uid}-hover-plot`}>
                <rect x={pl.x0} y={pl.y0} width={pl.x1 - pl.x0} height={pl.y1 - pl.y0} />
              </clipPath>
            </defs>
            {curve && (
              <path
                clipPath={`url(#${uid}-hover-plot)`}
                d={curve.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x)} ${sy(y)}`).join('')}
                fill="none"
                stroke={farve}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={valgt.optimal ? '0.1 5.5' : undefined}
              />
            )}
            <circle cx={sx(valgt.x)} cy={sy(valgt.y)} r="13" fill={farve} opacity="0.16" />
            <circle
              cx={sx(valgt.x)}
              cy={sy(valgt.y)}
              r="8"
              fill="#fff"
              stroke={farve}
              strokeWidth="2"
            />
            <circle
              cx={sx(valgt.x)}
              cy={sy(valgt.y)}
              r="4.5"
              fill={valgt.optimal ? '#fff' : farve}
              stroke={farve}
              strokeWidth={valgt.optimal ? 2 : 0}
            />
          </svg>
          <div
            className="personal-diagram-tooltip"
            role="status"
            style={{
              left: `${(sx(valgt.x) / size.width) * 100}%`,
              top: `${(sy(valgt.y) / size.height) * 100}%`,
              transform: hoejreSide
                ? 'translate(calc(-100% - 18px), -115%)'
                : 'translate(18px, -115%)',
            }}
          >
            <div className="personal-diagram-tooltip-row">
              <span
                className="personal-diagram-key"
                style={{
                  borderTopColor: farve,
                  borderTopStyle: valgt.optimal ? 'dotted' : 'solid',
                }}
              />
              <strong>{tooltipFormat.xText(valgt.x)}</strong>
              <span>{valgt.navn}</span>
            </div>
            <div className="personal-diagram-tooltip-sub">{tooltipFormat.euText(valgt.y)}</div>
          </div>
        </>
      )}
    </div>
  );
}
