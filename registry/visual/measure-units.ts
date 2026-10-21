/** Length, area and angle text for measured quantities (meters in, metric or imperial out).
 * Small lengths keep useful precision: millimeters in metric, sixteenth-inch fractions in imperial.
 */
export type MeasureUnits = "metric" | "imperial";

function fraction16(inches: number) {
  const whole = Math.floor(inches + 1e-9), sixteenths = Math.round((inches - whole) * 16);
  if (sixteenths === 16) return `${whole + 1}`;
  if (!sixteenths) return `${whole}`;
  let n = sixteenths, d = 16;
  while (n % 2 === 0) { n /= 2; d /= 2; }
  return whole ? `${whole} ${n}/${d}` : `${n}/${d}`;
}

/** "16 mm", "1.52 m", "5/8 in", "4 ft 11 in". */
export function formatLength(m: number, units: MeasureUnits = "metric"): string {
  if (!Number.isFinite(m)) return "—";
  if (units === "imperial") {
    const inches = m / 0.0254;
    if (inches < 3) return `${fraction16(inches)} in`;
    if (inches < 24) return `${Math.round(inches * 4) / 4} in`;
    const ft = Math.floor(inches / 12), inch = Math.round(inches - ft * 12);
    return inch === 12 ? `${ft + 1} ft` : inch ? `${ft} ft ${inch} in` : `${ft} ft`;
  }
  if (m < 0.1) return `${Math.round(m * 1000)} mm`;
  if (m < 1) return `${Math.round(m * 100)} cm`;
  return `${m < 10 ? Math.round(m * 100) / 100 : Math.round(m * 10) / 10} m`;
}

/** "71 m²" / "765 ft²". */
export function formatArea(m2: number, units: MeasureUnits = "metric"): string {
  if (!Number.isFinite(m2)) return "—";
  if (units === "imperial") return `${Math.round(m2 / 0.092903).toLocaleString("en")} ft²`;
  return `${m2 < 10 ? Math.round(m2 * 100) / 100 : Math.round(m2).toLocaleString("en")} m²`;
}

/** "26.6°" or roof pitch "6:12 (26.6°)". */
export function formatAngle(rad: number, style: "degrees" | "pitch" = "degrees"): string {
  const deg = (rad * 180) / Math.PI;
  const d = `${Math.round(deg * 10) / 10}°`;
  if (style !== "pitch") return d;
  const rise = Math.round(Math.tan(rad) * 12 * 2) / 2;
  return `${rise}:12 (${d})`;
}
