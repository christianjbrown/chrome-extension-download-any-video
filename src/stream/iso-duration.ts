// An ISO 8601 duration as DASH writes it: "PT1H2M3.5S", "P0DT0H3M30.000S".
// Years and months have no fixed length and never appear in a video's
// duration, so they are not read.
import { ifDefined } from "../shared/optional";
import { NOT_FOUND } from "../shared/search";

const DATE_PART = /^P(?:(\d+)D)?$/;
const TIME_PART = /^(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;
const TIME_MARK = "T";
// Where each count sits among the patterns' groups.
const DAYS_GROUP = 1;
const HOURS_GROUP = 1;
const MINUTES_GROUP = 2;
const SECONDS_GROUP = 3;
// A part the duration leaves out counts for nothing.
const LEFT_OUT = 0;

const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = MINUTES_IN_HOUR * SECONDS_IN_MINUTE;
const SECONDS_IN_DAY = HOURS_IN_DAY * SECONDS_IN_HOUR;

interface Parts {
  readonly date: string;
  readonly time: string;
}

function parts(text: string): Parts {
  const mark = text.indexOf(TIME_MARK);
  return mark === NOT_FOUND
    ? { date: text, time: "" }
    : { date: text.slice(0, mark), time: text.slice(mark + 1) };
}

function count(group: string | undefined): number {
  return Number(group ?? LEFT_OUT);
}

// The duration in seconds, or nothing when the text is not one.
export function durationSeconds(text: string | undefined): number | undefined {
  return ifDefined(text, secondsOf);
}

function secondsOf(text: string): number | undefined {
  const { date, time } = parts(text);
  const dateMatch = DATE_PART.exec(date);
  return dateMatch === null
    ? undefined
    : withTime(dateMatch, TIME_PART.exec(time));
}

function withTime(
  dateMatch: RegExpExecArray,
  timeMatch: RegExpExecArray | null,
): number | undefined {
  return timeMatch === null ? undefined : total(dateMatch, timeMatch);
}

function total(dateMatch: RegExpExecArray, timeMatch: RegExpExecArray): number {
  return (
    count(dateMatch[DAYS_GROUP]) * SECONDS_IN_DAY +
    count(timeMatch[HOURS_GROUP]) * SECONDS_IN_HOUR +
    count(timeMatch[MINUTES_GROUP]) * SECONDS_IN_MINUTE +
    count(timeMatch[SECONDS_GROUP])
  );
}
