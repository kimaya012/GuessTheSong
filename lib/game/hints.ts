import { normalizeText } from "@/lib/text";
import { cleanAlbum, cleanTitle } from "@/lib/catalog/seed";

// The album hint must never spell out the answer: singles and title songs
// ("Kal Ho Naa Ho" from Kal Ho Naa Ho) share their album's name.
export function albumHint(title: string, album: string | null): string | null {
  if (!album) return null;
  const a = normalizeText(cleanAlbum(album));
  const t = normalizeText(cleanTitle(title));
  if (!a) return null;
  return a === t ? "Title track" : album;
}
