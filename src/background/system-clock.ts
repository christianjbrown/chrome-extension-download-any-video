import type { Clock } from "./download-steps";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
