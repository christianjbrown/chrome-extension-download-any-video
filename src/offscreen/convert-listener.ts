import {
  isConvertRequest,
  type ConvertResponse,
} from "../shared/conversion-messages";
import type { ConvertHandling } from "./conversion-parts";

// Answers the conversion requests among the messages this document hears, and
// leaves every other message for someone else to answer.
export class ConvertListener {
  constructor(private readonly handler: ConvertHandling) {}

  // True when the answer comes later, which tells Chrome to keep the channel
  // open for it.
  received(
    message: unknown,
    sendResponse: (response: ConvertResponse) => void,
  ): boolean {
    if (!isConvertRequest(message)) {
      return false;
    }
    void this.handler.handle(message).then(sendResponse);
    return true;
  }
}
