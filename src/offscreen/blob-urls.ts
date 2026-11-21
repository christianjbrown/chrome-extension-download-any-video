import { CONVERTED_TYPE } from "../shared/conversion-messages";
import type { ObjectUrls } from "./conversion-parts";

// The part of the URL class that hands out blob URLs.
export interface BlobUrlApi {
  createObjectURL(blob: Blob): string;
}

// A blob cannot be made from memory shared with a worker, so bytes in it are
// refused, as the Blob constructor itself would refuse them.
export const SHARED_BYTES =
  "The converted video is in memory that cannot be saved";

function ownsItsBuffer(data: Uint8Array): data is Uint8Array<ArrayBuffer> {
  return data.buffer instanceof ArrayBuffer;
}

function blobPart(data: Uint8Array): Uint8Array<ArrayBuffer> {
  if (!ownsItsBuffer(data)) {
    throw new Error(SHARED_BYTES);
  }
  return data;
}

// The converted MP4 as a blob: URL, which lives as long as this document.
export class BlobUrls implements ObjectUrls {
  constructor(private readonly urls: BlobUrlApi) {}

  create(data: Uint8Array): string {
    return this.urls.createObjectURL(
      new Blob([blobPart(data)], { type: CONVERTED_TYPE }),
    );
  }
}
