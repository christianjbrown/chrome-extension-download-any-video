// A video the page might be showing, as one of its frames reports it.

// Where a candidate was found, most trustworthy first. The player's own
// element and the attributes around it describe the video that is playing;
// the page's metadata describes what the page is about; the network log is
// whatever the page happened to fetch.
export type CandidateOrigin = "element" | "player" | "metadata" | "network";

export interface VideoCandidate {
  readonly url: string;
  readonly origin: CandidateOrigin;
  // Height in pixels when the page or the URL says, otherwise 0.
  readonly height: number;
}

// What one frame answers when asked for its video.
export interface FrameReport {
  readonly title: string;
  readonly candidates: readonly VideoCandidate[];
}
