// DASH SegmentTemplate: one URL pattern that, filled in with a number or a
// time, names every piece of a representation.
import type { TemplateContext } from "./dash";
import { ATTRIBUTES, ELEMENTS } from "./dash-names";
import type { Piece } from "./tracks";
import {
  childNamed,
  childrenNamed,
  numberAttribute,
  type XmlElement,
} from "./xml";

export const UNKNOWN_LENGTH =
  "The manifest does not say how long the video is, so its pieces cannot be counted";

// "$RepresentationID$", "$Number%05d$", "$Time$", "$Bandwidth$" and "$$".
const PLACEHOLDER =
  /\$(RepresentationID|Number|Time|Bandwidth)?(?:%0(\d+)d)?\$/g;
// "$$" stands for a lone dollar sign.
const DOLLAR = "$";
const PAD = "0";
const DEFAULT_START_NUMBER = 1;
const DEFAULT_TIMESCALE = 1;
const NO_REPEATS = 0;
const UNTIL_END = -1;
// Where the first entry of a timeline starts when it does not say.
const PERIOD_START = 0;
// Without a known length the period is taken to be empty, so an r of -1
// adds nothing.
const NO_LENGTH = 0;
// The initialisation is not one of the numbered pieces.
const INIT_POSITION = 0;
// A template without a media pattern names its pieces with nothing.
const NO_MEDIA = "";

export interface Values {
  readonly RepresentationID: string;
  readonly Bandwidth: number;
  readonly Number: number;
  readonly Time: number;
}

// A value padded with zeros to the width the placeholder asks for, if any.
function padded(value: string, width: string | undefined): string {
  return width === undefined ? value : value.padStart(Number(width), PAD);
}

function isValueName(values: Values, name: string): name is keyof Values {
  return Object.hasOwn(values, name);
}

// What one named placeholder stands for. The pattern only matches names the
// values have, so a name they lack is left as it was written.
export function placeholderText(
  values: Values,
  name: string,
  width: string | undefined,
  written: string,
): string {
  return isValueName(values, name)
    ? padded(String(values[name]), width)
    : written;
}

function fill(template: string, values: Values): string {
  return template.replace(
    PLACEHOLDER,
    (written: string, name?: string, width?: string) =>
      name === undefined
        ? DOLLAR
        : placeholderText(values, name, width, written),
  );
}

// The segments' start times, in the template's timescale, and their numbers.
function segmentTimes(
  template: XmlElement,
  context: TemplateContext,
): { time: number; number: number }[] {
  const timescale = numberAttribute(
    template,
    ATTRIBUTES.timescale,
    DEFAULT_TIMESCALE,
  );
  const startNumber = numberAttribute(
    template,
    ATTRIBUTES.startNumber,
    DEFAULT_START_NUMBER,
  );
  const timeline = childNamed(template, ELEMENTS.segmentTimeline);
  const times =
    timeline === undefined
      ? fixedTimes(template, timescale, context)
      : timelineTimes(timeline, context.periodSeconds, timescale);
  return times.map((time, index) => ({ time, number: startNumber + index }));
}

// Segments all of one length run from the start of the period to its end.
function fixedTimes(
  template: XmlElement,
  timescale: number,
  context: TemplateContext,
): number[] {
  const duration = Number(template.attribute(ATTRIBUTES.duration));
  if (context.periodSeconds === undefined) {
    throw new Error(UNKNOWN_LENGTH);
  }
  const count = Math.ceil((context.periodSeconds * timescale) / duration);
  return Array.from({ length: count }, (_, index) => index * duration);
}

// How many segments an S entry stands for: itself and r repeats, or, with
// "r=-1", as many as fill the rest of the period.
function repeatCount(
  entry: XmlElement,
  time: number,
  periodTicks: number,
): number {
  const duration = Number(entry.attribute(ATTRIBUTES.length));
  const repeat = numberAttribute(entry, ATTRIBUTES.repeats, NO_REPEATS);
  return repeat === UNTIL_END
    ? Math.ceil((periodTicks - time) / duration)
    : repeat + 1;
}

// Each S entry starts at t, or where the last one ended, and runs for d
// ticks, r more times over.
function timelineTimes(
  timeline: XmlElement,
  periodSeconds: number | undefined,
  timescale: number,
): number[] {
  const periodTicks = ticksIn(periodSeconds, timescale);
  const times: number[] = [];
  let end = PERIOD_START;
  for (const entry of childrenNamed(timeline, ELEMENTS.timelineEntry)) {
    end = addEntry(times, entry, end, periodTicks);
  }
  return times;
}

function ticksIn(periodSeconds: number | undefined, timescale: number): number {
  return (periodSeconds ?? NO_LENGTH) * timescale;
}

// Adds an S entry's start times to the list, and says where the entry ends,
// which is where the next one starts when it does not say.
function addEntry(
  times: number[],
  entry: XmlElement,
  previousEnd: number,
  periodTicks: number,
): number {
  let time = numberAttribute(entry, ATTRIBUTES.start, previousEnd);
  const duration = Number(entry.attribute(ATTRIBUTES.length));
  const count = repeatCount(entry, time, periodTicks);
  for (let i = 0; i < count; i += 1) {
    times.push(time);
    time += duration;
  }
  return time;
}

// The values every piece of the representation fills in the same way.
type Fixed = Pick<Values, "RepresentationID" | "Bandwidth">;

function pieceAt(url: string, baseUrl: string): Piece {
  return { url: new URL(url, baseUrl).href, range: undefined };
}

function initPieces(
  template: XmlElement,
  fixed: Fixed,
  baseUrl: string,
): Piece[] {
  const initialization = template.attribute(ATTRIBUTES.initialization);
  return initialization === undefined
    ? []
    : [
        pieceAt(
          fill(initialization, {
            ...fixed,
            Number: INIT_POSITION,
            Time: INIT_POSITION,
          }),
          baseUrl,
        ),
      ];
}

// Every piece the template names, the initialisation first when it has one.
export function templatePieces(
  template: XmlElement,
  context: TemplateContext,
): Piece[] {
  const fixed: Fixed = {
    RepresentationID: context.representationId,
    Bandwidth: context.bandwidth,
  };
  const media = template.attribute(ATTRIBUTES.media) ?? NO_MEDIA;
  return [
    ...initPieces(template, fixed, context.baseUrl),
    ...segmentTimes(template, context).map(({ time, number }) =>
      pieceAt(
        fill(media, { ...fixed, Number: number, Time: time }),
        context.baseUrl,
      ),
    ),
  ];
}
