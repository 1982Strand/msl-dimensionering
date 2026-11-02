import { standard_data_state } from '../engine/auto-edit.ts';
import type { SavedSession } from '../engine/session-storage.ts';
import {
  indlaesOpsaetning,
  INDBYGGET_OPSAETNING,
  OPSAETNINGSFELT_MAP,
} from './udgave-opsaetning.ts';
import type { Access, Udgave } from './udgaver.ts';

export const OPSAETNINGSFELTER_AENDRBARE = INDBYGGET_OPSAETNING.kan_aendres.map((key) =>
  OPSAETNINGSFELT_MAP.get(key)!,
);

function valueAtPath(value: unknown, path: string[]): unknown {
  return path.reduce((node, key) => (node as Record<string, unknown>)[key], value);
}

function setAtPath(value: unknown, path: string[], next: unknown) {
  let node = value as Record<string, unknown>;
  for (const key of path.slice(0, -1)) node = node[key] as Record<string, unknown>;
  node[path.at(-1)!] = structuredClone(next);
}

export function sessionForEdition(
  session: SavedSession,
  edition: Udgave | Access,
  isNew = false,
  configuration = INDBYGGET_OPSAETNING,
): SavedSession {
  const access = typeof edition === 'string' ? null : edition;
  if ((access?.udgave ?? edition) !== 'offentlig') return session;

  const data = standard_data_state();
  data.indstillinger = indlaesOpsaetning(configuration);
  if (!isNew) {
    for (const { path } of configuration.kan_aendres.map((key) => OPSAETNINGSFELT_MAP.get(key)!)) {
      setAtPath(data.indstillinger, path, valueAtPath(session.data.indstillinger, path));
    }
  }
  return {
    data: {
      ...data,
      materialer: structuredClone(session.data.materialer),
      indstillinger: data.indstillinger,
    },
    values: structuredClone(session.values),
  };
}
