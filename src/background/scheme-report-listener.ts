import { isSchemeReport } from "../shared/scheme-messages";
import type { DeviceSchemeSink } from "./scheme-parts";

// Passes on the colour scheme reports among the messages the service worker
// hears, and ignores everything else.
export class SchemeReportListener {
  constructor(private readonly sink: DeviceSchemeSink) {}

  received(message: unknown): void {
    if (isSchemeReport(message)) {
      void this.sink.deviceIs(message.scheme);
    }
  }
}
