/**
 * The CC0 bark scans (Poly Haven) shipped for the FLORA2 stories, as `loadFloraScans` input. Files live in
 * `assets/textures/bark/` and are listed in `assets/THIRD_PARTY_ASSETS.json`. Consumers can load their own scans the
 * same way: a scan is found by the `scan.id` a profile surface names.
 */
const files = import.meta.glob("../../assets/textures/bark/*.jpg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const byName = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split("/").pop()!.replace(/\.jpg$/, ""), url]));
const ids = [...new Set(Object.keys(byName).map(n => n.replace(/_(diff|nor_gl|rough)$/, "")))];

export const BARK_SCAN_URLS: Record<string, { map: string; normal?: string; rough?: string }> = Object.fromEntries(
  ids.filter(id => byName[`${id}_diff`]).map(id => [id, { map: byName[`${id}_diff`], normal: byName[`${id}_nor_gl`], rough: byName[`${id}_rough`] }]));
