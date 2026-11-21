import { UNREADABLE_MANIFEST } from "../../src/stream/xml-parser";
import { xmlReader } from "./fakes";

const parseXml = (text: string) => xmlReader.parse(text);

describe("parseXml", () => {
  it("reads elements, attributes, text and nesting, skipping the prolog", () => {
    const root = parseXml(
      [
        '<?xml version="1.0" encoding="utf-8"?>',
        "<!DOCTYPE MPD>",
        "<!-- a manifest -->",
        '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static">',
        "  <Period id=\"0\" start = 'PT0S'>",
        "    <BaseURL>https://cdn.example/v/</BaseURL>",
        '    <AdaptationSet contentType="video"/>',
        "    <?processing instruction?>",
        "  </Period>",
        "</MPD>",
        "",
      ].join("\n"),
    );

    expect(root.name).toBe("MPD");
    expect(root.attribute("type")).toBe("static");
    expect(root.attribute("missing")).toBeUndefined();
    const period = root.children[0];
    expect(period?.name).toBe("Period");
    expect(period?.attribute("start")).toBe("PT0S");
    expect(period?.children.map((child) => child.name)).toEqual([
      "BaseURL",
      "AdaptationSet",
    ]);
    expect(period?.children[0]?.text).toBe("https://cdn.example/v/");
    expect(period?.children[1]?.children).toEqual([]);
  });

  it("decodes entities in text and attributes, and CDATA as it is", () => {
    const root = parseXml(
      '<a href="?x=1&amp;y=&quot;2&quot;">&lt;b&gt; &#65;&#x42;&apos;<![CDATA[<raw & text>]]></a>',
    );

    expect(root.attribute("href")).toBe('?x=1&y="2"');
    expect(root.text).toBe("<b> AB'<raw & text>");
  });

  it("drops namespace prefixes from element names", () => {
    const root = parseXml("<dash:MPD><dash:Period/></dash:MPD>");

    expect(root.name).toBe("MPD");
    expect(root.children[0]?.name).toBe("Period");
  });

  it("keeps a comment inside an element out of its text", () => {
    expect(parseXml("<a>one<!-- two -->three</a>").text).toBe("onethree");
  });

  it.each([
    ["nothing at all", ""],
    ["text before the root", "hello <a/>"],
    ["a tag that never closes", "<a><b></a>"],
    ["a mismatched closing tag", "<a></b>"],
    ["an unterminated element", "<a>"],
    ["an attribute without a value", "<a b></a>"],
    ["an attribute without quotes", "<a b=c></a>"],
    ["an unterminated attribute", '<a b="c></a>'],
    ["an unterminated comment", "<a><!-- </a>"],
    ["a second root", "<a/><b/>"],
    ["a nameless element", "<>"],
  ])("refuses %s", (_, text) => {
    expect(() => parseXml(text)).toThrow(UNREADABLE_MANIFEST);
  });
});
