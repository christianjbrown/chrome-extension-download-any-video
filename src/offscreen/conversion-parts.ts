// What a conversion request is handled with, as the parts that use them see
// them.
import type {
  ConvertRequest,
  ConvertResponse,
  ProgressReport,
} from "../shared/conversion-messages";

// Tells the service worker how far a job has got.
export interface ProgressSender {
  send(report: ProgressReport): void;
}

export interface ObjectUrls {
  // A URL Chrome can download, for bytes this document holds.
  create(data: Uint8Array): string;
}

// One conversion request, start to finish.
export interface ConvertHandling {
  handle(request: ConvertRequest): Promise<ConvertResponse>;
}
