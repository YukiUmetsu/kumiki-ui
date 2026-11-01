/** One-time reproducible import of Natural Earth 1:110m country outer rings.
 * Input: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
 * Licensing: public domain, https://www.naturalearthdata.com/about/terms-of-use/
 * Usage: node scripts/import-travel-geography.mjs /path/to/ne_110m_admin_0_countries.geojson
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Pass the already downloaded Natural Earth GeoJSON path.');
const data = JSON.parse(readFileSync(input, 'utf8'));
if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Expected Natural Earth FeatureCollection.');
const rings = [];
for (const feature of data.features) {
  const geometry = feature.geometry;
  if (!geometry) continue;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  for (const polygon of polygons) {
    // Outer rings are all we need for an antique land-colored atlas. Preserve
    // disconnected islands, instead of replacing geography with a blob shape.
    const ring = polygon[0];
    if (!Array.isArray(ring) || ring.length < 4) continue;
    const simplified = ring.map(([lon, lat]) => [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
    rings.push(simplified);
  }
}
if (rings.length < 200) throw new Error('The source is not the expected 1:110m global geometry.');
const file = `/** Natural Earth 1:110m country outer rings (longitude, latitude in degrees).\n * Public domain: https://www.naturalearthdata.com/about/terms-of-use/\n * Original dataset: https://github.com/nvkelso/natural-earth-vector\n * Quantized to 0.1 degree; geopolitical labels intentionally omitted.\n * Rebuild: node scripts/import-travel-geography.mjs /path/to/source.geojson\n */\nexport const TRAVEL_LAND_POLYGONS: readonly (readonly (readonly number[])[])[] = ${JSON.stringify(rings)};\n`;
const output = resolve('registry/craft/travel-geography.ts');
writeFileSync(output, file);
process.stdout.write(`Natural Earth: ${rings.length} outer rings, ${Buffer.byteLength(file)} bytes → ${output}\n`);
