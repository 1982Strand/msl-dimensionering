/** node tools/build-udgave.ts <intern|offentlig> — bygger udgaven til dist-<udgave>.
 * Typekontrollen hører til `npm run build`; den lokale udgave bygges dér til dist. */
import { resolve } from 'node:path';
import { build } from 'vite';
import { packPdfMotor } from './pak-pdf-motor.ts';

const udgave = process.argv[2];
if (udgave !== 'intern' && udgave !== 'offentlig')
  throw new Error('Angiv udgaven: intern eller offentlig.');

// Vite læser VITE_-variabler fra miljøet, når bygningen starter.
process.env.VITE_UDGAVE = udgave;
const outDir = resolve(`dist-${udgave}`);
await build({ build: { outDir, emptyOutDir: true } });
await packPdfMotor(outDir);
