// Decides which side of the input the suggestion list opens on, and how
// tall it may be, so it never runs under the footer or off the viewport.
export interface PlacementInput {
  inputTop: number; // input's viewport-relative top
  inputBottom: number;
  viewportHeight: number;
  footerTop: number | null; // footer's viewport-relative top, if rendered
  listHeight: number; // height of the list at its fullest
  gap: number; // space kept between list and input / edge
  topInset: number; // sticky header height to stay clear of
}

export interface Placement {
  placement: "down" | "up";
  maxHeight: number;
}

const MIN_HEIGHT = 120;

export function chooseListPlacement(p: PlacementInput): Placement {
  const floor = Math.min(p.viewportHeight, p.footerTop ?? Number.POSITIVE_INFINITY);
  const below = floor - p.inputBottom - p.gap;
  const above = p.inputTop - p.topInset - p.gap;

  if (below >= p.listHeight) return { placement: "down", maxHeight: p.listHeight };
  if (above >= p.listHeight) return { placement: "up", maxHeight: p.listHeight };

  // Neither side fits fully: use the roomier one and let the list scroll.
  const placement = above > below ? "up" : "down";
  return { placement, maxHeight: Math.max(MIN_HEIGHT, Math.floor(Math.max(above, below))) };
}
