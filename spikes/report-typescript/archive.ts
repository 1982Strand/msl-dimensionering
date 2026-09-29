/** Preserve report inputs, exact template/assets and PDF without overwriting history. */
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

export const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
export type Bundle = { files: Record<string, Buffer>; provenance: Record<string, unknown> };

function checkedName(name: string): void {
  if (!/^(?:assets\/[a-zA-Z0-9_-]+\.(?:png|jpeg|jpg|svg)|report\.(?:json|pdf|typ)|layout\.typ|theme\.json)$/.test(name)) {
    throw new Error(`Invalid bundle member ${name}`);
  }
}

export async function verifyBundle(directory: string): Promise<void> {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  if (manifest.schema_version !== 1) throw new Error('Unsupported bundle version');
  for (const [name, digest] of Object.entries(manifest.files)) {
    checkedName(name);
    if (sha256(await readFile(join(directory, name))) !== digest) throw new Error(`Bundle integrity failure: ${name}`);
  }
  const identity = sha256(JSON.stringify({files:manifest.files, provenance:manifest.provenance}));
  if (manifest.id !== identity || basename(directory) !== identity) throw new Error('Bundle identity failure');
}

export async function saveBundle(bundle: Bundle, archiveRoot: string): Promise<string> {
  const root = resolve(archiveRoot);
  const hashes: Record<string, string> = {};
  for (const name of Object.keys(bundle.files).sort()) {
    checkedName(name);
    hashes[name] = sha256(bundle.files[name]);
  }
  const id = sha256(JSON.stringify({files:hashes, provenance:bundle.provenance}));
  await mkdir(root, {recursive:true});
  const target = join(root,id);
  try {
    await readFile(join(target,'manifest.json'));
    await verifyBundle(target);
    return target;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const stage = await mkdtemp(join(root, 'pending-'));
  try {
    await mkdir(join(stage,'assets'));
    for (const [name, bytes] of Object.entries(bundle.files)) await writeFile(join(stage,name),bytes,{flag:'wx'});
    await writeFile(join(stage,'manifest.json'),JSON.stringify({schema_version:1,id,files:hashes,provenance:bundle.provenance},null,2),{flag:'wx'});
    try { await rename(stage,target); }
    catch (error) {
      if (!['EEXIST','ENOTEMPTY','EPERM'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await verifyBundle(target);
    }
    await verifyBundle(target);
    return target;
  } finally {
    if (dirname(resolve(stage)) !== root || !basename(stage).startsWith('pending-')) throw new Error('Unsafe archive cleanup path');
    await rm(stage,{recursive:true,force:true});
  }
}
