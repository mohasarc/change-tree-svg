export interface Palette {
  path: string;
  muted: string;
  container: string;
  markerAdded: string;
  markerChanged: string;
  markerMoved: string;
  markerRemoved: string;
}

const SHARED_MARKERS = {
  markerAdded: "#1a7f37",
  markerChanged: "#9a6700",
  markerMoved: "#8250df",
  markerRemoved: "#cf222e",
} as const;

export const LIGHT_PALETTE: Palette = {
  path: "#24292f",
  muted: "#6e7781",
  container: "rgba(175,184,193,0.12)",
  ...SHARED_MARKERS,
};

export const DARK_PALETTE: Palette = {
  path: "#c9d1d9",
  muted: "#8b949e",
  container: "rgba(110,118,129,0.15)",
  ...SHARED_MARKERS,
};
