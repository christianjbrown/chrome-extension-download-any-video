// The element and attribute names of a DASH manifest (ISO/IEC 23009-1) that
// the reader looks at.
export const ELEMENTS = {
  baseUrl: "BaseURL",
  period: "Period",
  adaptationSet: "AdaptationSet",
  representation: "Representation",
  segmentList: "SegmentList",
  segmentTemplate: "SegmentTemplate",
  segmentTimeline: "SegmentTimeline",
  segmentUrl: "SegmentURL",
  initialization: "Initialization",
  timelineEntry: "S",
  contentProtection: "ContentProtection",
} as const;

export const ATTRIBUTES = {
  type: "type",
  duration: "duration",
  presentationDuration: "mediaPresentationDuration",
  contentType: "contentType",
  mimeType: "mimeType",
  id: "id",
  bandwidth: "bandwidth",
  height: "height",
  sourceUrl: "sourceURL",
  range: "range",
  media: "media",
  mediaRange: "mediaRange",
  initialization: "initialization",
  timescale: "timescale",
  startNumber: "startNumber",
  start: "t",
  length: "d",
  repeats: "r",
} as const;
