// A video the page might be showing, as one of its frames reports it.

// Where a candidate was found, most trustworthy first. The player's own
// element and the attributes around it describe the video that is playing;
// the page's metadata describes what the page is about; the network log is
// whatever the page happened to fetch.
export const ELEMENT_ORIGIN = "element";
export const PLAYER_ORIGIN = "player";
export const METADATA_ORIGIN = "metadata";
export const NETWORK_ORIGIN = "network";
export type CandidateOrigin =
  | typeof ELEMENT_ORIGIN
  | typeof PLAYER_ORIGIN
  | typeof METADATA_ORIGIN
  | typeof NETWORK_ORIGIN;

// The height of a video when neither the page nor the URL says.
export const UNKNOWN_HEIGHT = 0;

export interface VideoCandidate {
  readonly url: string;
  readonly origin: CandidateOrigin;
  // Height in pixels when the page or the URL says, otherwise UNKNOWN_HEIGHT.
  readonly height: number;
}

// What one frame answers when asked for its video.
export interface FrameReport {
  readonly title: string;
  readonly candidates: readonly VideoCandidate[];
}
