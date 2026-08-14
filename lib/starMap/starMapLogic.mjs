/** @typedef {{ city: string; lat: number; lng: number; count: number; recentCount: number }} StarMapCity */
/** @typedef {{ total: number; cities: StarMapCity[]; eligibleCount: number; representedCount: number; missingCoordinatesCount: number }} StarMapSummary */

export const GERMANY_STAR_MAP_BOUNDS = {
  latMin: 47.27,
  latMax: 55.06,
  lngMin: 5.87,
  lngMax: 15.04,
};

export const STAR_MAP_RECENT_DAYS = 7;
export const STAR_MAP_CLUSTER_MIN_POINTS = 5;
export const STAR_MAP_CLUSTER_RADIUS_PX = 30;
export const STAR_MAP_COORD_DECIMALS = 2;

/** Shared SVG viewBox for silhouette + markers (Figma germany-silhouette is 500×500). */
export const GERMANY_STAR_MAP_VIEWBOX = {
  width: 500,
  height: 500,
};

const DE_LAT_MIN = 47.2;
const DE_LAT_MAX = 55.2;
const DE_LNG_MIN = 5.7;
const DE_LNG_MAX = 15.3;

function areValidCoordinates(lat, lng) {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lat >= DE_LAT_MIN &&
    lat <= DE_LAT_MAX &&
    lng >= DE_LNG_MIN &&
    lng <= DE_LNG_MAX
  );
}

function normalizeCity(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roundCoord(value) {
  const factor = 10 ** STAR_MAP_COORD_DECIMALS;
  return Math.round(value * factor) / factor;
}

function isRecent(timestamp, nowMs) {
  if (!timestamp) return false;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return false;
  const ageMs = nowMs - parsed;
  return ageMs >= 0 && ageMs <= STAR_MAP_RECENT_DAYS * 24 * 60 * 60 * 1000;
}

function cityKey(city) {
  return city.trim().toLowerCase();
}

function resolveRowLocation(row, plzByCode) {
  let lat = row.lat;
  let lng = row.lng;
  let city = normalizeCity(row.city);

  if (!areValidCoordinates(lat, lng)) {
    lat = null;
    lng = null;
  }

  const plz = row.postalCode?.trim();
  const plzRow = plz ? plzByCode.get(plz) : undefined;

  if ((lat == null || lng == null) && plzRow) {
    if (areValidCoordinates(plzRow.lat, plzRow.lng)) {
      lat = plzRow.lat;
      lng = plzRow.lng;
    }
  }

  if (!city && plzRow?.city) {
    city = normalizeCity(plzRow.city);
  }

  if (!city && plz) {
    city = `PLZ ${plz}`;
  }

  if (lat == null || lng == null || !city) {
    return null;
  }

  return { city, lat, lng };
}

export function buildStarMapSummary(rows, plzLookups, now = new Date()) {
  const plzByCode = new Map();
  for (const entry of plzLookups) {
    if (entry.postal_code) plzByCode.set(entry.postal_code, entry);
  }

  const eligibleCount = rows.length;
  let missingCoordinatesCount = 0;
  const groups = new Map();
  const nowMs = now.getTime();

  for (const row of rows) {
    const resolved = resolveRowLocation(row, plzByCode);
    if (!resolved) {
      missingCoordinatesCount += 1;
      continue;
    }

    const key = cityKey(resolved.city);
    const bucket = groups.get(key) ?? {
      city: resolved.city,
      latSum: 0,
      lngSum: 0,
      n: 0,
      count: 0,
      recentCount: 0,
    };
    bucket.latSum += resolved.lat;
    bucket.lngSum += resolved.lng;
    bucket.n += 1;
    bucket.count += 1;
    if (isRecent(row.mapTimestamp, nowMs)) bucket.recentCount += 1;
    groups.set(key, bucket);
  }

  const cities = Array.from(groups.values())
    .map((bucket) => ({
      city: bucket.city,
      lat: roundCoord(bucket.latSum / bucket.n),
      lng: roundCoord(bucket.lngSum / bucket.n),
      count: bucket.count,
      recentCount: bucket.recentCount,
    }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

  const representedCount = cities.reduce((sum, city) => sum + city.count, 0);

  return {
    total: representedCount,
    cities,
    eligibleCount,
    representedCount,
    missingCoordinatesCount,
  };
}

export function toPublicStarMapSummary(summary) {
  return {
    total: summary.total,
    cities: summary.cities,
    eligibleCount: summary.eligibleCount,
    representedCount: summary.representedCount,
    missingCoordinatesCount: summary.missingCoordinatesCount,
  };
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function projectLatLngToPercent(lat, lng, bounds) {
  const x = ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * 100;
  const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
  return { x: clampPercent(x), y: clampPercent(y) };
}

export function percentToPixels(xPercent, yPercent, widthPx, heightPx) {
  return {
    x: (xPercent / 100) * widthPx,
    y: (yPercent / 100) * heightPx,
  };
}

export function percentToViewBox(xPercent, yPercent, viewBox = GERMANY_STAR_MAP_VIEWBOX) {
  return {
    x: (xPercent / 100) * viewBox.width,
    y: (yPercent / 100) * viewBox.height,
  };
}

export function projectLatLngToViewBox(lat, lng, bounds, viewBox = GERMANY_STAR_MAP_VIEWBOX) {
  const percent = projectLatLngToPercent(lat, lng, bounds);
  return percentToViewBox(percent.x, percent.y, viewBox);
}

/** Visual diameter in CSS px at the 500-unit viewBox (1 unit ≈ 1px at 500px display). */
export function dotSizeForCount(count) {
  if (count <= 2) return 6;
  if (count <= 5) return 8;
  return 10;
}

/** SVG circle radius in viewBox units. Must stay tiny vs the 500×500 map. */
export function svgDotRadiusForCount(count) {
  return dotSizeForCount(count) / 2;
}

function slugifyCity(city) {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

function distancePx(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function projectStarMapCities(cities, bounds) {
  return cities.map((city) => {
    const projected = projectLatLngToPercent(city.lat, city.lng, bounds);
    return {
      kind: "point",
      id: slugifyCity(city.city),
      city: city.city,
      lat: city.lat,
      lng: city.lng,
      count: city.count,
      recentCount: city.recentCount,
      x: projected.x,
      y: projected.y,
    };
  });
}

export function clusterStarMapPoints(cities, options) {
  const radiusPx = options.radiusPx ?? STAR_MAP_CLUSTER_RADIUS_PX;
  const minPoints = options.minPoints ?? STAR_MAP_CLUSTER_MIN_POINTS;

  const points = projectStarMapCities(cities, options.bounds).map((point) => ({
    ...point,
    px: percentToPixels(point.x, point.y, options.mapWidthPx, options.mapHeightPx),
  }));

  const used = new Set();
  const renderables = [];

  for (let i = 0; i < points.length; i += 1) {
    if (used.has(i)) continue;

    const members = [];
    for (let j = 0; j < points.length; j += 1) {
      if (used.has(j)) continue;
      if (distancePx(points[i].px, points[j].px) <= radiusPx) {
        members.push(j);
      }
    }

    if (members.length >= minPoints) {
      for (const idx of members) used.add(idx);

      const clusterPoints = members.map((idx) => points[idx]);
      const count = clusterPoints.reduce((sum, p) => sum + p.count, 0);
      const recentCount = clusterPoints.reduce((sum, p) => sum + p.recentCount, 0);
      const x = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
      const y = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
      const lat = clusterPoints.reduce((sum, p) => sum + p.lat, 0) / clusterPoints.length;
      const lng = clusterPoints.reduce((sum, p) => sum + p.lng, 0) / clusterPoints.length;
      const label =
        clusterPoints
          .slice()
          .sort((a, b) => b.count - a.count)[0]?.city ?? "Cluster";

      renderables.push({
        kind: "cluster",
        id: `cluster-${members.join("-")}`,
        city: label,
        lat,
        lng,
        count,
        recentCount,
        x,
        y,
        memberCount: members.length,
      });
      continue;
    }

    used.add(i);
    const { px: _px, ...point } = points[i];
    renderables.push(point);
  }

  return renderables;
}
