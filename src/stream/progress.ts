// How far along a download of pieces is.
export interface Progress {
  report(done: number, total: number): void;
}
