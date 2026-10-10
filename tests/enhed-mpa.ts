/** B-084: appen skriver MPa, hvor originalen skrev MN/m² (1 MPa = 1 MN/m²). Referencerne er
 * uændrede; kun enheden i deres tekster omskrives, før de sammenlignes. */
export function mpa<T>(reference: T): T {
  return JSON.parse(JSON.stringify(reference).replaceAll('MN/m²', 'MPa')) as T;
}
