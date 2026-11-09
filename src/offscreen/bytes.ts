// One array holding every chunk, in order.
export function concatenate(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const whole = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    whole.set(chunk, offset);
    offset += chunk.length;
  }
  return whole;
}
