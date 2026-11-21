// An ISO 8601 duration as DASH writes it: "PT1H2M3.5S", "P0DT0H3M30.000S".
// Years and months have no fixed length and never appear in a video's
// duration, so they are not read.
import { NOT_FOUND } from "../shared/search";

const DATE_PART = /^P(?:(\d+)D)?$/;
const TIME_PART = /^(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;
const TIME_MARK = "T";

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
  return Number(group ?? 0);
}

// The duration in seconds, or nothing when the text is not one.
export function durationSeconds(text: string | undefined): number | undefined {
  if (text === undefined) {
    return undefined;
  }
  const { date, time } = parts(text);
  const dateMatch = DATE_PART.exec(date);
  const timeMatch = TIME_PART.exec(time);
  if (dateMatch === null || timeMatch === null) {
    return undefined;
  }
  return (
    count(dateMatch[1]) * SECONDS_IN_DAY +
    count(timeMatch[1]) * SECONDS_IN_HOUR +
    count(timeMatch[2]) * SECONDS_IN_MINUTE +
    count(timeMatch[3])
  );
}
