/** Gzip er filens indhold, uafhængigt af værtens HTTP-komprimering og MIME-type. */
export async function unpackPdfMotor(response: Response): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.ok) throw new Error(`PDF-motoren kunne ikke hentes: HTTP ${response.status}.`);
  let bytes = new Uint8Array(await response.arrayBuffer());
  // En vært kan allerede have udpakket filen via Content-Encoding: gzip.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined')
      throw new Error('Browseren understøtter ikke udpakning af PDF-motoren (gzip).');
    try {
      const stream = new Response(bytes).body!.pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
      throw new Error('PDF-motorens gzip-fil kunne ikke pakkes ud.', { cause: error });
    }
  }
  const header = [0, 0x61, 0x73, 0x6d, 1, 0, 0, 0];
  if (!header.every((byte, index) => bytes[index] === byte))
    throw new Error('Den hentede PDF-motor er ikke en gyldig WASM-fil.');
  return bytes;
}
