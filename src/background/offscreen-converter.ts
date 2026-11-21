import {
  CONVERT_REQUEST,
  CONVERTED_EXTENSION,
  isConvertResponse,
  isProgressReport,
  type ConvertRequest,
  type ConvertResponse,
  type ProgressReport,
} from "../shared/conversion-messages";
import type { OffscreenHost } from "./hidden-page";
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
        converted: true,
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
    return urlOf(await this.answer(this.parts.nextId(), url, onProgress));
  }

  // Hears the job's progress until the offscreen document answers.
  private async answer(
    jobId: string,
    url: string,
    onProgress: StageProgressListener,
  ): Promise<unknown> {
    const { runtime } = this.parts;
    const listener: MessageListener = (message) => {
      if (isProgressFor(message, jobId)) {
        onProgress(message.stage, message.ratio);
      }
    };
    runtime.onMessage.addListener(listener);
    try {
      return await runtime.sendMessage({ type: CONVERT_REQUEST, jobId, url });
    } finally {
      runtime.onMessage.removeListener(listener);
    }
  }
}

function isProgressFor(
  message: unknown,
  jobId: string,
): message is ProgressReport {
  return isProgressReport(message) && message.jobId === jobId;
}

function urlOf(response: unknown): string {
  if (!isConvertResponse(response)) {
    throw new Error(NO_ANSWER);
  }
  return convertedUrl(response);
}

function convertedUrl(response: ConvertResponse): string {
  if (!response.ok) {
    throw new ConversionError(response.stage, response.message);
  }
  return response.url;
}
