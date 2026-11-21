import type { Clock } from "./download-steps";

// The time now, from whatever the entry point reads it from.
export class SystemClock implements Clock {
  constructor(private readonly currentTime: () => Date) {}

  now(): Date {
    return this.currentTime();
  }
}
