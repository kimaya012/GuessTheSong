import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  genre: "Genre",
  releaseYear: "Year",
  duration: "Duration",
  album: "Album",
  artist: "Artist",
};

function formatValue(key: string, value: string | number | null | undefined): string {
  if (value == null) return "Unknown";
  if (key === "duration" && typeof value === "number") {
    const m = Math.floor(value / 60);
    const s = value % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return String(value);
}

interface HintsPanelProps {
  revealedHints: Partial<Record<string, string | number | null>>;
}

export function HintsPanel({ revealedHints }: HintsPanelProps) {
  const entries = Object.entries(revealedHints);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No hints yet — skip to unlock one.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-sm">
          {LABELS[key] ?? key}: {formatValue(key, value)}
        </Badge>
      ))}
    </div>
  );
}
