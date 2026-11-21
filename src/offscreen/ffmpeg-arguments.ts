// ffmpeg's own flags, values and stream names, as its command line spells them.

// Names an input file, in a plan and when asking about a file.
export const INPUT_FLAG = "-i";
export const MAP_FLAG = "-map";
export const THREADS_FLAG = "-threads";
export const PRESET_FLAG = "-preset";
export const CRF_FLAG = "-crf";
export const PIXEL_FORMAT_FLAG = "-pix_fmt";
export const PROFILE_FLAG = "-profile:v";
export const VIDEO_FILTER_FLAG = "-vf";
export const AUDIO_BITRATE_FLAG = "-b:a";
export const MOV_FLAGS_FLAG = "-movflags";

// The picture's and the sound's codec.
export const VIDEO_CODEC_FLAG = "-c:v";
export const AUDIO_CODEC_FLAG = "-c:a";
// Keeps a stream's encoded bytes as they are.
export const COPY_CODEC = "copy";
export const H264_ENCODER = "libx264";

// The index goes at the front of the file, so players start at once.
export const FAST_START_FLAG = "+faststart";
// H.264 needs even dimensions, so odd ones are rounded up by a pixel.
export const EVEN_DIMENSIONS = "scale=ceil(iw/2)*2:ceil(ih/2)*2";

export const FIRST_VIDEO_STREAM = "0:v:0";
// The trailing ? keeps ffmpeg from refusing a silent video.
export const FIRST_AUDIO_STREAM_IF_ANY = "0:a:0?";
export const SECOND_INPUT_AUDIO_IF_ANY = "1:a:0?";
