import { standard_data_state } from '../engine/auto-edit.ts';
import type { SavedSession } from '../engine/session-storage.ts';
import type { Access, Udgave } from './udgaver.ts';

export const VISUAL_SETTINGS_FIELDS = [
  { key: 'ind_opb_enhed', path: ['opbygning', 'enhed'] },
  { key: 'ind_opb_paaskrift', path: ['opbygning', 'geonet_paaskrift'] },
  { key: 'ind_opb_maal_streg', path: ['opbygning', 'maal_streg'] },
  { key: 'ind_opb_maal_tal', path: ['opbygning', 'maal_tal'] },
  { key: 'ind_opb_signatur', path: ['opbygning', 'signatur'] },
  { key: 'ind_afr_vis_eksakt', path: ['afrunding', 'vis_eksakt'] },
] as const;

export function sessionForEdition(session: SavedSession, edition: Udgave | Access): SavedSession {
  const access = typeof edition === 'string' ? null : edition;
  if ((access?.udgave ?? edition) !== 'offentlig') return session;

  const data = standard_data_state();
  const settings = data.indstillinger;
  for (const { path } of VISUAL_SETTINGS_FIELDS) {
    const [group, field] = path;
    (settings[group] as unknown as Record<string, unknown>)[field] = (
      session.data.indstillinger[group] as unknown as Record<string, unknown>
    )[field];
  }
  return {
    data: {
      ...data,
      materialer: structuredClone(session.data.materialer),
      indstillinger: settings,
    },
    values: structuredClone(session.values),
  };
}
