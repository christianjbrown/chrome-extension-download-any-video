// Drives the offscreen document's wiring through a fake chrome and a fake
// ffmpeg, end to end.
import type { FfmpegApi } from "../../src/offscreen/ffmpeg-engine";

type Listener = (...args: unknown[]) => unknown;

const logListeners: ((event: { message: string }) => void)[] = [];
const DESCRIBE_ARGUMENTS = 2;

const ffmpeg = {
  loaded: false as boolean,
  load: vi.fn(() => {
    ffmpeg.loaded = true;
    return Promise.resolve(true);
  }),
  on: vi.fn((event: string, callback: never) => {
    if (event === "log") {
      logListeners.push(callback);
    }
  }),
  off: vi.fn(),
  // Asked to describe the input, says it is a VP9 video with Opus sound.
  exec: vi.fn((args: string[]) => {
    if (args.length === DESCRIBE_ARGUMENTS) {
      for (const listener of logListeners) {
        listener({
          message:
            "  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv), 640x360",
        });
        listener({
          message: "  Stream #0:1: Audio: opus, 48000 Hz, mono, fltp",
        });
      }
    }
    return Promise.resolve(0);
  }),
  writeFile: vi.fn().mockResolvedValue(true),
  readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2])),
  deleteFile: vi.fn().mockResolvedValue(true),
} satisfies FfmpegApi;

vi.mock("@ffmpeg/ffmpeg", () => ({
  // The real class is `new`-ed, so the stand-in has to be a constructor too.
  FFmpeg: function FakeFFmpeg(): FfmpegApi {
    return ffmpeg;
  },
}));

function chromeEvent() {
  const listeners: Listener[] = [];
  return {
    listeners,
    addListener: (listener: Listener) => listeners.push(listener),
    fire: (...args: unknown[]) =>
      listeners.map((listener) => listener(...args)),
  };
}

function fakeChrome() {
  return {
    runtime: {
      getURL: (path: string) => `chrome-extension://x/${path}`,
      sendMessage: vi
        .fn()
        .mockRejectedValue(new Error("Receiving end does not exist")),
      onMessage: chromeEvent(),
    },
  };
}

function fakeResponse(bytes: number[]) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-length": String(bytes.length) }),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(bytes));
        controller.close();
      },
    }),
    text: () => Promise.resolve(""),
    arrayBuffer: () => Promise.resolve(new Uint8Array(bytes).buffer),
  };
}

// A playlist, as text.
function textResponse(text: string) {
  return { ...fakeResponse([]), text: () => Promise.resolve(text) };
}

async function load() {
  vi.resetModules();
  const chrome = fakeChrome();
  vi.stubGlobal("chrome", chrome);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse([5, 6, 7])));
  vi.spyOn(URL, "createObjectURL").mockReturnValue(
    "blob:chrome-extension://x/9",
  );
  await import("../../src/offscreen/main");
  return chrome;
}

describe("offscreen document", () => {
  it("converts the video it is asked for and answers with a blob URL", async () => {
    const chrome = await load();
    const sendResponse = vi.fn();

    const kept = chrome.runtime.onMessage.fire(
      { type: "convert", jobId: "j1", url: "https://x/a.webm" },
      {},
      sendResponse,
    );

    expect(kept).toEqual([true]);
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        ok: true,
        url: "blob:chrome-extension://x/9",
      });
    });
    expect(ffmpeg.load).toHaveBeenCalledWith(
      expect.objectContaining({
        coreURL: "chrome-extension://x/ffmpeg/ffmpeg-core.js",
        classWorkerURL: "chrome-extension://x/ffmpeg-worker.js",
      }),
    );
    expect(ffmpeg.writeFile).toHaveBeenCalledWith(
      "input",
      new Uint8Array([5, 6, 7]),
    );
    expect(ffmpeg.exec).toHaveBeenLastCalledWith(
      expect.arrayContaining(["libx264", "aac", "output.mp4"]),
    );
    expect(fetch).toHaveBeenCalledWith("https://x/a.webm", {
      credentials: "include",
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "progress",
      jobId: "j1",
      stage: "fetch",
      ratio: 1,
    });
    const [blob] = vi.mocked(URL.createObjectURL).mock.calls[0]!;
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe("video/mp4");
  });

  it("stitches an HLS stream's pieces into one input, with its separate sound", async () => {
    const chrome = await load();
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) =>
      Promise.resolve(
        {
          "https://x/master.m3u8": textResponse(
            '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",URI="audio.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1,RESOLUTION=640x360,AUDIO="a"\nvideo.m3u8\n',
          ),
          "https://x/video.m3u8": textResponse(
            '#EXTM3U\n#EXT-X-MAP:URI="vinit.mp4"\n#EXTINF:1,\nv0.m4s\n#EXTINF:1,\nv1.m4s\n',
          ),
          "https://x/audio.m3u8": textResponse("#EXTM3U\n#EXTINF:1,\na0.m4s\n"),
          "https://x/vinit.mp4": fakeResponse([1]),
          "https://x/v0.m4s": fakeResponse([2]),
          "https://x/v1.m4s": fakeResponse([3]),
          "https://x/a0.m4s": fakeResponse([9]),
        }[url as string] as Response,
      ),
    );
    const sendResponse = vi.fn();

    chrome.runtime.onMessage.fire(
      { type: "convert", jobId: "j2", url: "https://x/master.m3u8" },
      {},
      sendResponse,
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        ok: true,
        url: "blob:chrome-extension://x/9",
      });
    });
    expect(ffmpeg.writeFile).toHaveBeenCalledWith(
      "input",
      new Uint8Array([1, 2, 3]),
    );
    expect(ffmpeg.writeFile).toHaveBeenCalledWith(
      "audio-input",
      new Uint8Array([9]),
    );
    expect(ffmpeg.exec).toHaveBeenLastCalledWith(
      expect.arrayContaining(["-i", "audio-input", "-map", "1:a:0?"]),
    );
    expect(fetch).toHaveBeenCalledWith("https://x/v0.m4s", {
      headers: {},
      credentials: "include",
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: "progress",
      jobId: "j2",
      stage: "fetch",
      ratio: 0.75,
    });
  });

  it("reads a DASH manifest and fetches the piece it names", async () => {
    const chrome = await load();
    const manifest = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static">',
      "<Period>",
      '<AdaptationSet contentType="video">',
      '<Representation id="v" bandwidth="1">',
      "<BaseURL>DASH_720.mp4</BaseURL>",
      "</Representation>",
      "</AdaptationSet>",
      "</Period>",
      "</MPD>",
    ].join("\n");
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) =>
      Promise.resolve(
        (url === "https://x/d/manifest.mpd"
          ? textResponse(manifest)
          : fakeResponse([4, 2])) as Response,
      ),
    );
    const sendResponse = vi.fn();

    chrome.runtime.onMessage.fire(
      { type: "convert", jobId: "j3", url: "https://x/d/manifest.mpd" },
      {},
      sendResponse,
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        ok: true,
        url: "blob:chrome-extension://x/9",
      });
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://x/d/DASH_720.mp4",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(ffmpeg.writeFile).toHaveBeenCalledWith(
      "input",
      new Uint8Array([4, 2]),
    );
  });

  it("ignores messages that are not for it", async () => {
    const chrome = await load();

    expect(
      chrome.runtime.onMessage.fire({ type: "progress" }, {}, vi.fn()),
    ).toEqual([false]);
  });
});
