// Why a stream cannot be downloaded, in the words the button's tooltip shows.
// The readers only know which reason applies; the wording is wired in.
export interface StreamRefusals {
  readonly encrypted: string;
  readonly live: string;
  readonly noStreams: string;
  readonly emptyPlaylist: string;
  readonly notAPlaylist: string;
}
