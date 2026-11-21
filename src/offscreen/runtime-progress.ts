import type { ProgressReport } from "../shared/conversion-messages";
import type { ProgressSender } from "./conversion-parts";

export interface ProgressChannel {
  sendMessage(report: ProgressReport): Promise<unknown>;
}

// Sends each report to the service worker and waits for nothing back.
export class RuntimeProgress implements ProgressSender {
  constructor(private readonly channel: ProgressChannel) {}

  send(report: ProgressReport): void {
    // Nobody listening is not a problem worth stopping for.
    this.channel.sendMessage(report).catch(() => undefined);
  }
}
