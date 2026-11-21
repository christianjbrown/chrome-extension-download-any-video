import { BlobUrls } from "../../src/offscreen/blob-urls";

describe("BlobUrls", () => {
  it("hands out a URL for an MP4 blob of the bytes", async () => {
    const api = { createObjectURL: vi.fn().mockReturnValue("blob:x/1") };

    expect(new BlobUrls(api).create(new Uint8Array([1, 2]))).toBe("blob:x/1");

    const blob = api.createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("video/mp4");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
      new Uint8Array([1, 2]),
    );
  });
});
