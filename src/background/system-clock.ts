import type { Clock } from "./video-filename";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
