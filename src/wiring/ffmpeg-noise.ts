// Part of the offscreen document's wiring: what ffmpeg prints after the real
// reason, the running counter, the sign-off and the wasm runtime's own exit
// note. Another kind of noise is another entry here.
export const FFMPEG_NOISE: readonly RegExp[] = [
  /^\s*$/,
  /^(frame|size)=/,
  /^Conversion failed!$/,
  /^Aborted\(/,
];
