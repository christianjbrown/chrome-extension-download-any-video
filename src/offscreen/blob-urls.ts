import { CONVERTED_TYPE } from "../shared/conversion-messages";
import type { ObjectUrls } from "./conversion-parts";

// The part of the URL class that hands out blob URLs.
export interface BlobUrlApi {
  createObjectURL(blob: Blob): string;
}

// The converted MP4 as a blob: URL, which lives as long as this document.
export class BlobUrls implements ObjectUrls {
  constructor(private readonly urls: BlobUrlApi) {}

  create(data: Uint8Array): string {
    return this.urls.createObjectURL(
      new Blob([data as BlobPart], { type: CONVERTED_TYPE }),
    );
  }
}
