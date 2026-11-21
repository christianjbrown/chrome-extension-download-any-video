import type { AddressTest } from "./address-test";

const WEB_URL = /^https?:\/\//i;

// An address on the web, http or https, rather than a blob or data URL.
export class WebUrls implements AddressTest {
  matches(url: string): boolean {
    return WEB_URL.test(url);
  }
}
