import { MediaCandidates } from "../../src/page/media-candidates";
import { heights, media } from "../shared/media";

// The candidates the page script itself would make of an address.
export const candidates = new MediaCandidates(media, heights);
