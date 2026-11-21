import {
  AUDIO_INPUT_NAME,
  ConversionPlanner,
  INPUT_NAME,
  NO_VIDEO,
  OUTPUT_NAME,
} from "../../src/offscreen/conversion-plan";
import {
  CompatibleAudioCopy,
  CompatibleVideoCopy,
} from "../../src/offscreen/copy-shortcuts";

const settings = {
  threads: 4,
  preset: "veryfast",
  crf: 20,
  profile: "high",
  audioBitrate: "160k",
};
const planner = new ConversionPlanner(settings, {
  video: [new CompatibleVideoCopy()],
  audio: [new CompatibleAudioCopy()],
});

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
      planner.plan(
        {
          video: { codec: "h264", pixelFormat: "yuv420p" },
          audio: { codec: "aac" },
        },
        undefined,
      ),
    ).toEqual([...head, "-c:v", "copy", "-c:a", "copy", ...tail]);
  });

  it("takes the sound from a second input when the stream kept it apart", () => {
    expect(
      planner.plan(
        { video: { codec: "h264", pixelFormat: "yuv420p" } },
        { audio: { codec: "aac" } },
      ),
    ).toEqual([
      "-threads",
      "4",
      "-i",
      INPUT_NAME,
      "-i",
      AUDIO_INPUT_NAME,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0?",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      ...tail,
    ]);
  });

  it("re-encodes any other video codec, and any other pixel format", () => {
    expect(
      planner.plan(
        {
          video: { codec: "vp9", pixelFormat: "yuv420p" },
          audio: { codec: "opus" },
        },
        undefined,
      ),
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
      planner.plan(
        { video: { codec: "h264", pixelFormat: "yuv444p" } },
        undefined,
      ),
    ).toEqual([...head, ...encodeVideo, ...tail]);
  });

  it("says no to a file with no picture", () => {
    expect(() => planner.plan({ audio: { codec: "mp3" } }, undefined)).toThrow(
      NO_VIDEO,
    );
  });

  it("tries each shortcut in turn and takes the first that suits", () => {
    const never = { suits: () => false, args: ["-never"] };
    const always = { suits: () => true, args: ["-always"] };
    const choosy = new ConversionPlanner(settings, {
      video: [never, always],
      audio: [never],
    });

    expect(
      choosy.plan(
        {
          video: { codec: "av1", pixelFormat: "yuv420p" },
          audio: { codec: "aac" },
        },
        undefined,
      ),
    ).toEqual([...head, "-always", "-c:a", "aac", "-b:a", "160k", ...tail]);
  });
});
