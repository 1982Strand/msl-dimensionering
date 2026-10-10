import { useId, useMemo } from 'react';
import { byg_designdiagram, personalDiagramInput } from '../engine/personal-diagram';
import type { DimensioningResult } from '../engine/construction';
import type { ProductRow } from '../engine/products';
import type { BasisTable } from '../engine/types';
import { pythonFixed } from '../engine/python-numbers';
import { diagramModel, renderPersonalDiagramSvg } from '../engine/personal-diagram-svg';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Notice } from './Notice';
import { DiagramCanvas } from './DiagramCanvas';

export function PersonalDiagram({
  result,
  products,
  table,
  showInput,
  showEndpoints,
  onChange,
}: {
  result: DimensioningResult;
  products: { one: ProductRow[]; two: ProductRow[] };
  table?: BasisTable | null;
  showInput: boolean;
  showEndpoints: boolean;
  onChange: (key: string, value: boolean) => void;
}) {
  const id = useId();
  const uid = `personal-diagram-${id.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const args = useMemo(
    () => personalDiagramInput(result, products, table ?? undefined, showInput, showEndpoints),
    [result, products, table, showInput, showEndpoints],
  );
  const diagram = useMemo(() => {
    try {
      const model = diagramModel(byg_designdiagram(args));
      return { model, svg: renderPersonalDiagramSvg(model, { idPrefix: uid }), failure: null };
    } catch (error) {
      return {
        model: null,
        svg: '',
        failure: error instanceof Error ? error.message : String(error),
      };
    }
  }, [args, uid]);
  const custom = result.tilstand === 'Brugerdefineret';
  const basis =
    result.grundlag_type === 'trafikklasse'
      ? `Trafikklasse ${result.t_klasse}`
      : `Belastningsklasse ${result.valgt_klasse}`;
  return (
    <section className="section-card settings-card" aria-labelledby={`${id}-heading`}>
      <div className="construction-heading">
        <h2 id={`${id}-heading`}>Designdiagram</h2>
      </div>
      <p className="figure-note">
        Eₒ = {pythonFixed(result.eo, 0)} MPa · {basis}
        {custom ? ` · φᵥ = ${pythonFixed(result.phi, 1).replace('.', ',')}°` : ''} ·{' '}
        {result.geonet_navn}
      </p>
      {custom && (
        <div className="figure-choices">
          <div className="setting-checkbox">
            <Checkbox
              id={`${id}-input`}
              checked={showInput}
              disabled={!result.materialer.length}
              onCheckedChange={(checked) => onChange('bd_dd_vis_din_prik', checked === true)}
            />
            <Label htmlFor={`${id}-input`}>Vis indtastet opbygning</Label>
          </div>
          <div className="setting-checkbox">
            <Checkbox
              id={`${id}-endpoints`}
              checked={showEndpoints}
              onCheckedChange={(checked) => onChange('bd_dd_vis_lag_prikker', checked === true)}
            />
            <Label htmlFor={`${id}-endpoints`}>Vis endepunkter for 1 og 2 lag geonet</Label>
          </div>
        </div>
      )}
      {diagram.failure && (
        <Notice kind="warning" role="alert">
          Kunne ikke generere designdiagram: {diagram.failure}
        </Notice>
      )}
      {diagram.model && <DiagramCanvas m={diagram.model} svg={diagram.svg} uid={uid} />}
    </section>
  );
}
