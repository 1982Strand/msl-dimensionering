/** B-073: »Genstart app«. Den lokale preview-server (startfilen) kan bygge appen igen fra den
 * aktuelle kode, så en ny version vises uden at lukke serveren; preview slår filerne op ved hver
 * forespørgsel. Endepunkterne findes kun i `vite preview`, aldrig i en statisk udgivelse (B-060). */
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

/** Kun kald fra appens egen side; en anden hjemmeside i browseren må ikke kunne starte en bygning. */
export function sameOrigin(origin: string | undefined, host: string | undefined) {
  return Boolean(origin && host) && origin === `http://${host}`;
}

/** Ny version: der er committet kode, som den byggede app ikke er lavet af. */
export function versionStatus(head: string, built: string) {
  return { version: built, nyVersion: Boolean(head) && head !== built };
}

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};
const read = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8').trim() : '');

export function appGenstart(): Plugin {
  return {
    name: 'msl-genstart',
    configurePreviewServer(server) {
      const root = server.config.root;
      const dist = resolve(root, server.config.build.outDir);
      const stamp = resolve(dist, '.bygget');
      const lockMarker = resolve(root, 'node_modules', '.msl-pakker');
      let busy = false;

      const head = () =>
        new Promise<string>((done) =>
          execFile('git', ['rev-parse', 'HEAD'], { cwd: root }, (error, stdout) =>
            done(error ? '' : stdout.trim()),
          ),
        );
      // Preview sætter NODE_ENV=production; arvet af npm ville det fjerne udviklingspakkerne
      // (TypeScript, typer, Playwright), så bygningen fejler. Børneprocesserne får det ikke.
      const env = { ...process.env };
      delete env.NODE_ENV;
      // Output vises også i serverens vindue; de sidste linjer sendes med ved fejl.
      const run = (args: string[]) =>
        new Promise<void>((done, fail) => {
          let output = '';
          const child = spawn('npm', args, { cwd: root, env, shell: true });
          const collect = (chunk: Buffer) => {
            process.stdout.write(chunk);
            output = (output + chunk.toString()).slice(-4000);
          };
          child.stdout.on('data', collect);
          child.stderr.on('data', collect);
          child.on('error', fail);
          child.on('close', (code) =>
            code === 0 ? done() : fail(new Error(`npm ${args.join(' ')} fejlede.\n${output}`)),
          );
        });

      server.middlewares.use('/__app/status', (_req: IncomingMessage, res: ServerResponse) => {
        void head().then((h) =>
          json(res, 200, { lokal: true, genstarter: busy, ...versionStatus(h, read(stamp)) }),
        );
      });

      server.middlewares.use('/__app/genstart', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return json(res, 405, { ok: false, fejl: 'Kun POST.' });
        if (!sameOrigin(req.headers.origin, req.headers.host))
          return json(res, 403, { ok: false, fejl: 'Kun fra appens egen side.' });
        if (busy) return json(res, 409, { ok: false, fejl: 'Appen genstartes allerede.' });
        busy = true;
        void (async () => {
          try {
            console.log('\nGenstart app: bygger den aktuelle version ...');
            // Nye pakker installeres kun, når låsefilen er ændret siden sidste genstart.
            const lock = createHash('sha256')
              .update(read(resolve(root, 'package-lock.json')))
              .digest('hex');
            if (read(lockMarker) !== lock) {
              await run(['install', '--include=dev', '--no-audit', '--no-fund']);
              writeFileSync(lockMarker, lock);
            }
            await run(['run', 'build']);
            const h = await head();
            if (h) writeFileSync(stamp, `${h}\n`);
            console.log('Genstart app: færdig.\n');
            json(res, 200, { ok: true });
          } catch (error) {
            console.error(error);
            json(res, 500, {
              ok: false,
              fejl: error instanceof Error ? error.message : String(error),
            });
          } finally {
            busy = false;
          }
        })();
      });
    },
  };
}
