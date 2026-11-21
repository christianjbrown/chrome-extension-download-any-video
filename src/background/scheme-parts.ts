// What the toolbar's colour scheme is worked out from and drawn with, as the
// parts that use them see them.
import type { ColourScheme } from "../shared/colour-scheme";

// Hears the scheme the device is in, as the offscreen document saw it.
export interface DeviceSchemeSink {
  deviceIs(scheme: ColourScheme): Promise<void>;
}

// Reads the colour scheme a tab shows.
export interface SchemeReader {
  read(tabId: number): Promise<ColourScheme | undefined>;
}

// Hears the scheme a page in a tab showed, which is Chrome's own.
export interface TabSchemeSink {
  tabShows(scheme: ColourScheme): Promise<void>;
}

// Keeps what is known about the toolbar's colour.
export interface SchemeMemory {
  load(): Promise<SchemeState>;
  save(state: SchemeState): Promise<void>;
}

// Draws the button's icon for a scheme.
export interface SchemeIcon {
  show(scheme: ColourScheme): Promise<void>;
}

// What is known about the colour of Chrome's toolbar.
//
// Chrome has its own Light and Dark setting, which can differ from the
// device's. The offscreen document only ever sees the device's, and only a
// page in a tab sees Chrome's, so both are kept.
export interface SchemeState {
  // What the device is in, as the offscreen document last saw it.
  device: ColourScheme;
  // What Chrome is set to, once a tab has shown that it differs from the device.
  chrome: ColourScheme | null;
}

// How each report moves the state on, and which scheme the toolbar is in.
export interface SchemePolicy {
  afterDevice(state: SchemeState, device: ColourScheme): SchemeState;
  afterTab(state: SchemeState, tab: ColourScheme): SchemeState;
  toolbarScheme(state: SchemeState): ColourScheme;
}
