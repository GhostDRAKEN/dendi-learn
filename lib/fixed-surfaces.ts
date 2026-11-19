type VerticalBounds = { top: number; bottom: number }

// Return the smallest scroll needed to keep a focused control in the useful viewport.
export function getFocusScrollDelta(bounds: VerticalBounds, availableBottom: number, gap = 12) {
  if (bounds.top < gap) return bounds.top - gap
  if (bounds.bottom > availableBottom - gap) return bounds.bottom - availableBottom + gap
  return 0
}
