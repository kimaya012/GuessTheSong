// A small hand-drawn film-reel mark — the game's wordmark glyph. Plain
// currentColor strokes, no gradient fill, so it sits quietly in either theme.
export function ReelMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="6.2" r="1.5" fill="currentColor" />
      <circle cx="16.8" cy="9.4" r="1.5" fill="currentColor" />
      <circle cx="15" cy="15.2" r="1.5" fill="currentColor" />
      <circle cx="9" cy="15.2" r="1.5" fill="currentColor" />
      <circle cx="7.2" cy="9.4" r="1.5" fill="currentColor" />
    </svg>
  );
}
