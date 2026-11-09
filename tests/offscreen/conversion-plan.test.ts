import {
  ConversionPlanner,
  INPUT_NAME,
  NO_VIDEO,
  OUTPUT_NAME,
} from "../../src/offscreen/conversion-plan";

const planner = new ConversionPlanner();

const head = [
  "-threads",
  "4",
  "-i",
  INPUT_NAME,
  "-map",
  "0:v:0",
  "-map",
  "0:a:0?",
];
const tail = ["-movflags", "+faststart", OUTPUT_NAME];
const encodeVideo = [
  "-threads",
  "4",
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "20",
  "-pix_fmt",
  "yuv420p",
  "-profile:v",
  "high",
  "-vf",
  "scale=ceil(iw/2)*2:ceil(ih/2)*2",
];

describe("ConversionPlanner", () => {
  it("copies video and audio that already play everywhere", () => {
    expect(
      planner.plan({
        video: { codec: "h264", pixelFormat: "yuv420p" },
        audio: { codec: "aac" },
      }),
    ).toEqual([...head, "-c:v", "copy", "-c:a", "copy", ...tail]);
  });

  it("re-encodes any other video codec, and any other pixel format", () => {
    expect(
      planner.plan({
        video: { codec: "vp9", pixelFormat: "yuv420p" },
        audio: { codec: "opus" },
      }),
    ).toEqual([
      ...head,
      ...encodeVideo,
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      ...tail,
    ]);
    expect(
      planner.plan({ video: { codec: "h264", pixelFormat: "yuv444p" } }),
    ).toEqual([...head, ...encodeVideo, ...tail]);
  });

  it("says no to a file with no picture", () => {
    expect(() => planner.plan({ audio: { codec: "mp3" } })).toThrow(NO_VIDEO);
  });
});
