import {
  CONVERT_REQUEST,
  isConvertResponse,
  isProgressReport,
  type ConvertRequest,
} from "../shared/conversion-messages";
import type { OffscreenHost } from "./offscreen-document";
import {
  ConversionError,
  type StageProgressListener,
  type VideoConverter,
  type VideoSource,
} from "./video-converter";

type MessageListener = (message: unknown) => void;

interface Messenger {
  sendMessage(message: ConvertRequest): Promise<unknown>;
  onMessage: {
    addListener(listener: MessageListener): void;
    removeListener(listener: MessageListener): void;
  };
}

export interface ConverterParts {
  readonly host: OffscreenHost;
  readonly runtime: Messenger;
  // Tells one job's progress reports from another's.
  readonly nextId: () => string;
}

export const CONVERTED_EXTENSION = "mp4";
const NO_ANSWER = "The converter gave no answer";

// Hands the video to the offscreen document and waits for the MP4 it makes.
export class OffscreenConverter implements VideoConverter {
  constructor(private readonly parts: ConverterParts) {}

  async convert(
    url: string,
    onProgress: StageProgressListener,
  ): Promise<VideoSource> {
    const { host } = this.parts;
    await host.open();
    try {
      return {
        url: await this.ask(url, onProgress),
        extension: CONVERTED_EXTENSION,
        release: () => host.release(),
      };
    } catch (error) {
      await host.release();
      throw error;
    }
  }

  private async ask(
    url: string,
    onProgress: StageProgressListener,
  ): Promise<string> {
    const { runtime } = this.parts;
    const jobId = this.parts.nextId();
    const listener: MessageListener = (message) => {
      if (isProgressReport(message) && message.jobId === jobId) {
        onProgress(message.stage, message.ratio);
      }
    };
    runtime.onMessage.addListener(listener);
    let response: unknown;
    try {
      response = await runtime.sendMessage({
        type: CONVERT_REQUEST,
        jobId,
        url,
      });
    } finally {
      runtime.onMessage.removeListener(listener);
    }
    if (!isConvertResponse(response)) {
      throw new Error(NO_ANSWER);
    }
    if (!response.ok) {
      throw new ConversionError(response.stage, response.message);
    }
    return response.url;
  }
}
