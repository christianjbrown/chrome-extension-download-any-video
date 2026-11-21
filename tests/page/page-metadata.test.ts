import { candidates } from "./candidates";
import { MetadataFinder } from "../../src/page/page-metadata";
import { element } from "./fakes";

const META_SELECTOR =
  'meta[property="og:video"], meta[name="og:video"], meta[property="og:video:url"], meta[name="og:video:url"], meta[property="og:video:secure_url"], meta[name="og:video:secure_url"], meta[property="twitter:player:stream"], meta[name="twitter:player:stream"]';
const JSON_LD_SELECTOR = 'script[type="application/ld+json"]';

function page(
  metas: ReturnType<typeof element>[],
  scripts: ReturnType<typeof element>[],
) {
  return {
    querySelectorAll: (selector: string) => {
      if (selector === META_SELECTOR) return metas;
      if (selector === JSON_LD_SELECTOR) return scripts;
      throw new Error(`unexpected selector ${selector}`);
    },
  };
}

describe("MetadataFinder", () => {
  const finder = new MetadataFinder(
    (text) => JSON.parse(text) as unknown,
    candidates,
  );

  it("takes the video files the meta tags and structured data name", () => {
    const metas = [
      element("meta", {
        attributes: { content: "https://cdn.example/og-720p.mp4" },
      }),
      element("meta", {
        attributes: { content: "https://x.example/embed/player" },
      }),
      element("meta"),
    ];
    const scripts = [
      element("script", {
        text: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", name: "A page" },
            {
              "@type": ["VideoObject", "Thing"],
              contentUrl: "https://cdn.example/ld.webm",
              embedUrl: "https://x.example/embed",
              thumbnail: {
                "@type": "ImageObject",
                url: "https://cdn.example/t.jpg",
              },
            },
          ],
        }),
      }),
      element("script", {
        text: JSON.stringify({ "@type": "VideoObject", contentUrl: 7 }),
      }),
      element("script", { text: "{not json" }),
      element("script", { text: null }),
      element("script", { text: JSON.stringify(["a", null, 3]) }),
    ];

    expect(finder.find(page(metas, scripts))).toEqual([
      {
        url: "https://cdn.example/og-720p.mp4",
        origin: "metadata",
        height: 720,
      },
      { url: "https://cdn.example/ld.webm", origin: "metadata", height: 0 },
    ]);
  });

  it("finds nothing on a page without any", () => {
    expect(finder.find(page([], []))).toEqual([]);
  });
});
