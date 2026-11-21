// What the toolbar's colour scheme is worked out from and drawn with, as the
// parts that use them see them.
import type { ColourScheme } from "../shared/colour-scheme";

// Hears the scheme the device is in, as the offscreen document saw it.
export interface DeviceSchemeSink {
  deviceIs(scheme: ColourScheme): Promise<void>;
}
