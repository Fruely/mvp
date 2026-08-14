import { GERMANY_SILHOUETTE_PATH } from "./germanySilhouettePath.mjs";

/** Inset so a 6–8px core plus glow stays inside the stylized border. */
export const STAR_MAP_SILHOUETTE_INSET = 12;

function parseSvgPathToPolygon(d) {
  const nums = d.match(/-?\d*\.?\d+/g) ?? [];
  const points = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
  }
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first.x === last.x && first.y === last.y) points.pop();
  }
  return points;
}

const GERMANY_POLYGON = parseSvgPathToPolygon(GERMANY_SILHOUETTE_PATH);

function polygonCentroid(polygon) {
  let x = 0;
  let y = 0;
  for (const point of polygon) {
    x += point.x;
    y += point.y;
  }
  const n = polygon.length || 1;
  return { x: x / n, y: y / n };
}

const GERMANY_CENTROID = polygonCentroid(GERMANY_POLYGON);

export function pointInPolygon(point, polygon = GERMANY_POLYGON) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function nearestPointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: a.x, y: a.y, dist: Math.hypot(point.x - a.x, point.y - a.y) };
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return { x, y, dist: Math.hypot(point.x - x, point.y - y) };
}

export function nearestPointOnPolygon(point, polygon = GERMANY_POLYGON) {
  let best = { x: polygon[0].x, y: polygon[0].y, dist: Infinity };
  for (let i = 0; i < polygon.length; i += 1) {
    const candidate = nearestPointOnSegment(point, polygon[i], polygon[(i + 1) % polygon.length]);
    if (candidate.dist < best.dist) best = candidate;
  }
  return best;
}

export function distanceToPolygon(point, polygon = GERMANY_POLYGON) {
  return nearestPointOnPolygon(point, polygon).dist;
}

function insetTowardCentroid(start, margin, polygon = GERMANY_POLYGON) {
  const dx = GERMANY_CENTROID.x - start.x;
  const dy = GERMANY_CENTROID.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let lo = 0;
  let hi = Math.max(margin, Math.hypot(dx, dy));
  let best = { x: start.x + ux * margin, y: start.y + uy * margin };

  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    const candidate = { x: start.x + ux * mid, y: start.y + uy * mid };
    if (pointInPolygon(candidate, polygon) && distanceToPolygon(candidate, polygon) >= margin) {
      best = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return best;
}

/**
 * Keep a projected viewBox point inside the stylized Germany path.
 * Does not change lat/lng — only the rendered SVG coordinate.
 */
export function containPointInSilhouette(
  x,
  y,
  { margin = STAR_MAP_SILHOUETTE_INSET, polygon = GERMANY_POLYGON } = {},
) {
  const point = { x, y };
  if (pointInPolygon(point, polygon) && distanceToPolygon(point, polygon) >= margin) {
    return point;
  }

  const start = pointInPolygon(point, polygon) ? point : nearestPointOnPolygon(point, polygon);
  return insetTowardCentroid(start, margin, polygon);
}

export function isPointSafelyInsideSilhouette(
  x,
  y,
  { margin = STAR_MAP_SILHOUETTE_INSET, polygon = GERMANY_POLYGON } = {},
) {
  const point = { x, y };
  return pointInPolygon(point, polygon) && distanceToPolygon(point, polygon) >= margin - 0.5;
}
