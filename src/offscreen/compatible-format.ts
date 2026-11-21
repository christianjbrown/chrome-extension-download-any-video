// What plays everywhere: H.264 with 4:2:0 colour and AAC sound, in an MP4.
export const COMPATIBLE_VIDEO_CODEC = "h264";
export const COMPATIBLE_PIXEL_FORMAT = "yuv420p";
export const COMPATIBLE_AUDIO_CODEC = "aac";

// ffmpeg's flags for the picture's and the sound's codec.
export const VIDEO_CODEC_FLAG = "-c:v";
export const AUDIO_CODEC_FLAG = "-c:a";
// Keeps a stream's encoded bytes as they are.
export const COPY_CODEC = "copy";
