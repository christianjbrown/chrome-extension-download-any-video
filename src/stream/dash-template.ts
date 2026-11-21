// DASH SegmentTemplate: one URL pattern that, filled in with a number or a
// time, names every piece of a representation.
import { ATTRIBUTES, ELEMENTS } from "./dash-names";
import type { Piece } from "./tracks";
import { childNamed, childrenNamed, type XmlElement } from "./xml";

export interface TemplateContext {
  readonly representationId: string;
  readonly bandwidth: number;
  readonly baseUrl: string;
  // The period's length in seconds, when the manifest says.
  readonly periodSeconds: number | undefined;
}

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

interface Values {
  readonly RepresentationID: string;
  readonly Bandwidth: number;
  readonly Number: number;
  readonly Time: number;
}

function fill(template: string, values: Values): string {
  return template.replace(
    PLACEHOLDER,
    (_match, name?: string, width?: string) => {
      if (name === undefined) {
        return DOLLAR;
      }
      const value = String(values[name as keyof Values]);
      return width === undefined ? value : value.padStart(Number(width), PAD);
    },
  );
}

// The segments' start times, in the template's timescale, and their numbers.
function segmentTimes(
  template: XmlElement,
  context: TemplateContext,
): { time: number; number: number }[] {
  const timescale = Number(
    template.attribute(ATTRIBUTES.timescale) ?? DEFAULT_TIMESCALE,
  );
  const startNumber = Number(
    template.attribute(ATTRIBUTES.startNumber) ?? DEFAULT_START_NUMBER,
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
  const repeat = Number(entry.attribute(ATTRIBUTES.repeats) ?? NO_REPEATS);
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
  const periodTicks = (periodSeconds ?? NO_LENGTH) * timescale;
  const times: number[] = [];
  let time = PERIOD_START;
  for (const entry of childrenNamed(timeline, ELEMENTS.timelineEntry)) {
    time = Number(entry.attribute(ATTRIBUTES.start) ?? time);
    const duration = Number(entry.attribute(ATTRIBUTES.length));
    const count = repeatCount(entry, time, periodTicks);
    for (let i = 0; i < count; i += 1) {
      times.push(time);
      time += duration;
    }
  }
  return times;
}

// Every piece the template names, the initialisation first when it has one.
export function templatePieces(
  template: XmlElement,
  context: TemplateContext,
): Piece[] {
  const base = {
    RepresentationID: context.representationId,
    Bandwidth: context.bandwidth,
  };
  const pieces: Piece[] = [];
  const initialization = template.attribute(ATTRIBUTES.initialization);
  if (initialization !== undefined) {
    const url = fill(initialization, {
      ...base,
      Number: INIT_POSITION,
      Time: INIT_POSITION,
    });
    pieces.push({ url: new URL(url, context.baseUrl).href, range: undefined });
  }
  const media = template.attribute(ATTRIBUTES.media) ?? NO_MEDIA;
  for (const { time, number } of segmentTimes(template, context)) {
    const url = fill(media, { ...base, Number: number, Time: time });
    pieces.push({ url: new URL(url, context.baseUrl).href, range: undefined });
  }
  return pieces;
}
