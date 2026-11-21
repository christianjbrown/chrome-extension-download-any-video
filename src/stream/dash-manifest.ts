// Reads a DASH manifest (an MPD): the representations of its first period,
// each with the pieces that make it up.
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
  const base = childNamed(element, ELEMENTS.baseUrl)?.text.trim();
  return base === undefined ? parent : new URL(base, parent).href;
}

// Picture or sound, from the set's or the representation's own word. Anything
// else, like subtitles, is not a track to download.
function roleOf(
  set: XmlElement,
  representation: XmlElement,
): DashRole | undefined {
  const type =
    set.attribute(ATTRIBUTES.contentType) ??
    representation.attribute(ATTRIBUTES.mimeType) ??
    set.attribute(ATTRIBUTES.mimeType) ??
    NO_TYPE;
  return DASH_ROLES.find((role) => type.startsWith(role));
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
    const root = this.xml(text);
    const live = root.attribute(ATTRIBUTES.type) === DYNAMIC;
    const encrypted = hasDescendantNamed(root, ELEMENTS.contentProtection);
    const period = childNamed(root, ELEMENTS.period);
    if (period === undefined) {
      return { live, encrypted, representations: [] };
    }
    const where: Period = {
      baseUrl: baseUrlOf(period, baseUrlOf(root, url)),
      seconds:
        durationSeconds(period.attribute(ATTRIBUTES.duration)) ??
        durationSeconds(root.attribute(ATTRIBUTES.presentationDuration)),
    };
    return {
      live,
      encrypted,
      representations: childrenNamed(period, ELEMENTS.adaptationSet).flatMap(
        (set) => this.setRepresentations(set, where),
      ),
    };
  }

  private setRepresentations(
    set: XmlElement,
    period: Period,
  ): DashRepresentation[] {
    const setBase = baseUrlOf(set, period.baseUrl);
    return childrenNamed(set, ELEMENTS.representation).flatMap(
      (representation) => {
        const role = roleOf(set, representation);
        if (role === undefined) {
          return [];
        }
        const bandwidth = Number(
          representation.attribute(ATTRIBUTES.bandwidth) ?? UNKNOWN_SIZE,
        );
        const context: TemplateContext = {
          representationId: representation.attribute(ATTRIBUTES.id) ?? NO_ID,
          bandwidth,
          baseUrl: baseUrlOf(representation, setBase),
          periodSeconds: period.seconds,
        };
        return [
          {
            role,
            bandwidth,
            height: Number(
              representation.attribute(ATTRIBUTES.height) ?? UNKNOWN_SIZE,
            ),
            pieces: this.pieces(set, representation, context),
          },
        ];
      },
    );
  }

  private pieces(
    set: XmlElement,
    representation: XmlElement,
    context: TemplateContext,
  ): Piece[] {
    for (const source of this.sources) {
      const pieces = source.pieces(set, representation, context);
      if (pieces !== undefined) {
        return pieces;
      }
    }
    return [{ url: context.baseUrl, range: undefined }];
  }
}
