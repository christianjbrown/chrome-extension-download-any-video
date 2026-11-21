import { MetadataSource } from "../../src/page/metadata-source";
import { tree } from "./fakes";

describe("MetadataSource", () => {
  it("reads the metadata of the document it was given", () => {
    const page = tree();
    const found = [
      { url: "https://cdn.example/og.mp4", origin: "metadata", height: 0 },
    ];
    const metadata = { find: vi.fn().mockReturnValue(found) };

    expect(new MetadataSource(page, metadata).find()).toBe(found);
    expect(metadata.find).toHaveBeenCalledWith(page);
  });
});
