// Reads a DASH manifest (an MPD): the representations of its first period,
// each with the pieces that make it up.
import { firstFound } from "../shared/optional";
import {
  DASH_ROLES,
  type DashManifest,
  type DashParsing,
  type DashRepresentation,
  type DashRole,
  type PieceSource,
  type TemplateContext,
} from "./dash";
import { ATTRIBUTES, ELEMENTS } from "./dash-names";
import { durationSeconds } from "./iso-duration";
import { UNKNOWN_SIZE, type Piece } from "./tracks";
import {
  childNamed,
  childrenNamed,
  hasDescendantNamed,
  numberAttribute,
  type XmlElement,
  type XmlParser,
} from "./xml";

// The manifest type of a live stream, which keeps growing.
const DYNAMIC = "dynamic";
// A representation without an id fills $RepresentationID$ with nothing.
const NO_ID = "";
// A representation that says nothing of its type is neither picture nor sound.
const NO_TYPE = "";

// A BaseURL child narrows the address everything below it is relative to.
function baseUrlOf(element: XmlElement, parent: string): string {
  const base = baseTextOf(element);
  return base === undefined ? parent : new URL(base, parent).href;
}

function baseTextOf(element: XmlElement): string | undefined {
  return childNamed(element, ELEMENTS.baseUrl)?.text.trim();
}

// Picture or sound, from the set's or the representation's own word. Anything
// else, like subtitles, is not a track to download.
function roleOf(
  set: XmlElement,
  representation: XmlElement,
): DashRole | undefined {
  const type = typeOf(set, representation);
  return DASH_ROLES.find((role) => type.startsWith(role));
}

// The set's content type, or else the representation's MIME type, or else
// the set's.
function typeOf(set: XmlElement, representation: XmlElement): string {
  const said = [
    set.attribute(ATTRIBUTES.contentType),
    representation.attribute(ATTRIBUTES.mimeType),
    set.attribute(ATTRIBUTES.mimeType),
  ];
  return said.find((type) => type !== undefined) ?? NO_TYPE;
}

function periodSeconds(
  root: XmlElement,
  period: XmlElement,
): number | undefined {
  return (
    durationSeconds(period.attribute(ATTRIBUTES.duration)) ??
    durationSeconds(root.attribute(ATTRIBUTES.presentationDuration))
  );
}

// Where the period's representations sit and how long it runs.
interface Period {
  readonly baseUrl: string;
  readonly seconds: number | undefined;
}

// Parses the text as XML, then reads the first period only: a single video is
// one period. The first source that names a representation's pieces wins;
// when none does, the representation is one whole file at its base address
// (SegmentBase, or nothing at all).
export class DashManifestParser implements DashParsing {
  constructor(
    private readonly xml: XmlParser,
    private readonly sources: readonly PieceSource[],
  ) {}

  parse(text: string, url: string): DashManifest {
    const root = this.xml.parse(text);
    const period = childNamed(root, ELEMENTS.period);
    return {
      live: root.attribute(ATTRIBUTES.type) === DYNAMIC,
      encrypted: hasDescendantNamed(root, ELEMENTS.contentProtection),
      representations:
        period === undefined
          ? []
          : this.periodRepresentations(root, period, url),
    };
  }

  private periodRepresentations(
    root: XmlElement,
    period: XmlElement,
    url: string,
  ): DashRepresentation[] {
    const where: Period = {
      baseUrl: baseUrlOf(period, baseUrlOf(root, url)),
      seconds: periodSeconds(root, period),
    };
    return childrenNamed(period, ELEMENTS.adaptationSet).flatMap((set) =>
      this.setRepresentations(set, where),
    );
  }

  private setRepresentations(
    set: XmlElement,
    period: Period,
  ): DashRepresentation[] {
    const where = { ...period, baseUrl: baseUrlOf(set, period.baseUrl) };
    return childrenNamed(set, ELEMENTS.representation).flatMap(
      (representation) => this.representation(set, representation, where),
    );
  }

  // Nothing for a representation that is neither picture nor sound.
  private representation(
    set: XmlElement,
    representation: XmlElement,
    where: Period,
  ): DashRepresentation[] {
    const role = roleOf(set, representation);
    return role === undefined
      ? []
      : [this.described(set, representation, role, where)];
  }

  private described(
    set: XmlElement,
    representation: XmlElement,
    role: DashRole,
    where: Period,
  ): DashRepresentation {
    const bandwidth = numberAttribute(
      representation,
      ATTRIBUTES.bandwidth,
      UNKNOWN_SIZE,
    );
    const context: TemplateContext = {
      representationId: representation.attribute(ATTRIBUTES.id) ?? NO_ID,
      bandwidth,
      baseUrl: baseUrlOf(representation, where.baseUrl),
      periodSeconds: where.seconds,
    };
    return {
      role,
      bandwidth,
      height: numberAttribute(representation, ATTRIBUTES.height, UNKNOWN_SIZE),
      pieces: this.pieces(set, representation, context),
    };
  }

  private pieces(
    set: XmlElement,
    representation: XmlElement,
    context: TemplateContext,
  ): Piece[] {
    return (
      firstFound(this.sources, (source) =>
        source.pieces(set, representation, context),
      ) ?? [{ url: context.baseUrl, range: undefined }]
    );
  }
}
