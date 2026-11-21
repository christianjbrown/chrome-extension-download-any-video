// Streams that can go into the MP4 as they are, without re-encoding.
import {
  COMPATIBLE_AUDIO_CODEC,
  COMPATIBLE_PIXEL_FORMAT,
  COMPATIBLE_VIDEO_CODEC,
} from "./compatible-format";
import {
  AUDIO_CODEC_FLAG,
  COPY_CODEC,
  VIDEO_CODEC_FLAG,
} from "./ffmpeg-arguments";
import type { AudioStream, Shortcut, VideoStream } from "./conversion-parts";

// H.264 with 4:2:0 colour already plays everywhere.
export class CompatibleVideoCopy implements Shortcut<VideoStream> {
  readonly args: readonly string[] = [VIDEO_CODEC_FLAG, COPY_CODEC];

  suits(video: VideoStream): boolean {
    return (
      video.codec === COMPATIBLE_VIDEO_CODEC &&
      video.pixelFormat === COMPATIBLE_PIXEL_FORMAT
    );
  }
}

// AAC sound already plays everywhere.
export class CompatibleAudioCopy implements Shortcut<AudioStream> {
  readonly args: readonly string[] = [AUDIO_CODEC_FLAG, COPY_CODEC];

  suits(audio: AudioStream): boolean {
    return audio.codec === COMPATIBLE_AUDIO_CODEC;
  }
}
