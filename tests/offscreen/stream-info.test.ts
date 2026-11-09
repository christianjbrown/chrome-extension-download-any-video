import { StreamInfoParser } from "../../src/offscreen/stream-info";

const parser = new StreamInfoParser();

describe("StreamInfoParser", () => {
  it("reads the codecs and pixel format out of ffmpeg's description", () => {
    expect(
      parser.parse([
        "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'input':",
        "  Duration: 00:00:06.01, start: 0.000000, bitrate: 864 kb/s",
        "  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), 1280x720 [SAR 1:1 DAR 16:9], 783 kb/s, 30 fps, 30 tbr, 15360 tbn (default)",
        "  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 69 kb/s (default)",
      ]),
    ).toEqual({
      video: { codec: "h264", pixelFormat: "yuv420p" },
      audio: { codec: "aac" },
    });
  });

  it("takes the first video stream, so cover art does not count", () => {
    expect(
      parser.parse([
        "  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv, bt709/unknown/unknown), 640x360, SAR 1:1 DAR 16:9, 30 fps, 30 tbr, 1k tbn (default)",
        "  Stream #0:1: Audio: opus, 48000 Hz, mono, fltp (default)",
        "  Stream #0:2: Video: mjpeg (Baseline), yuvj420p(pc, bt470bg/unknown/unknown), 600x600 (attached pic)",
      ]),
    ).toEqual({
      video: { codec: "vp9", pixelFormat: "yuv420p" },
      audio: { codec: "opus" },
    });
  });

  it("leaves out what is not there", () => {
    expect(
      parser.parse([
        "  Stream #0:0: Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(tv), 3840x2160",
      ]),
    ).toEqual({ video: { codec: "hevc", pixelFormat: "yuv420p10le" } });
    expect(parser.parse(["  Stream #0:0: Audio: mp3, 44100 Hz"])).toEqual({
      audio: { codec: "mp3" },
    });
    expect(parser.parse(["input: Invalid data found"])).toEqual({});
  });
});
