/**
 * Application-level semantics for search_specialists_local_radius v2.
 * Mirrors supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql
 * without touching the database.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_SERVICE_RADII_KM,
  isAllowedServiceRadiusKm,
  isWithinDualRadius,
} from "../specialists/geography.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATION_V2 = join(
  ROOT,
  "supabase/manual_migrations/2026-07-18_search_specialists_local_radius_v2.sql"
);
const ROLLBACK_V2 = join(
  ROOT,
  "supabase/manual-rollbacks/2026-07-18_search_specialists_local_radius_v2.sql"
);

function extractFunctionBody(sql) {
  const start = sql.indexOf("AS $function$");
  const end = sql.indexOf("$function$;", start);
  assert.ok(start >= 0 && end > start, "function body delimiters missing");
  return sql.slice(start, end);
}

const ALLOWED = new Set(ALLOWED_SERVICE_RADII_KM);

/** p_mode gate used by v2 (empty for online/unknown). */
function modeAllowsWorkFormat(pMode, workFormat) {
  if (pMode != null && !["offline", "hybrid", "local"].includes(pMode)) {
    return false; // online + unknown → empty
  }
  if (pMode == null || pMode === "local") {
    return workFormat === "offline" || workFormat === "hybrid";
  }
  if (pMode === "offline") return workFormat === "offline";
  if (pMode === "hybrid") return workFormat === "hybrid";
  return false;
}

function normalizePagination(pOffset, pLimit) {
  const offset = Math.max(pOffset == null ? 0 : pOffset, 0);
  let limit;
  if (pLimit == null) limit = 20;
  else if (pLimit <= 0) limit = 0;
  else limit = pLimit;
  return { offset, limit };
}

function matchesLocalRadiusRpcV2(row, params) {
  const {
    pRadiusKm,
    pMode = null,
    pLang = null,
    pCategoryId = null,
  } = params;

  if (!modeAllowsWorkFormat(pMode, row.workFormat)) return false;
  if (row.isActive !== true || row.isVisible !== true) return false;
  if (row.lat == null || row.lng == null) return false;
  if (row.lat === 0 && row.lng === 0) return false;
  if (!ALLOWED.has(row.serviceRadiusKm)) return false;
  if (!Number.isFinite(row.distanceKm)) return false;
  if (row.distanceKm > pRadiusKm) return false;
  if (row.distanceKm > row.serviceRadiusKm) return false;
  if (pCategoryId != null && row.categoryId !== pCategoryId) return false;
  if (pLang != null) {
    const langs = Array.isArray(row.languages) ? row.languages : [];
    if (!langs.includes(pLang)) return false;
  }
  return true;
}

function rankLocalRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    if (a.isPro !== b.isPro) return a.isPro ? -1 : 1;
    const ra = a.rating == null ? Number.NEGATIVE_INFINITY : a.rating;
    const rb = b.rating == null ? Number.NEGATIVE_INFINITY : b.rating;
    // DESC NULLS LAST: nulls after numbers
    const aNull = a.rating == null;
    const bNull = b.rating == null;
    if (aNull !== bNull) return aNull ? 1 : -1;
    if (ra !== rb) return rb - ra;
    return String(a.id).localeCompare(String(b.id));
  });
}

const base = {
  isActive: true,
  isVisible: true,
  lat: 50.74,
  lng: 7.1,
  serviceRadiusKm: 25,
  languages: ["ru"],
  categoryId: "cat-a",
  isPro: false,
  rating: null,
  distanceKm: 3,
  workFormat: "offline",
  id: "a",
};

test("1. offline inside both radii → found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, distanceKm: 3, serviceRadiusKm: 25 },
      { pRadiusKm: 10 }
    ),
    true
  );
  assert.equal(
    isWithinDualRadius({
      workFormat: "offline",
      distanceKm: 3,
      userSearchRadiusKm: 10,
      specialistServiceRadiusKm: 25,
    }),
    true
  );
});

test("2. offline outside user radius → not found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, distanceKm: 12, serviceRadiusKm: 25 },
      { pRadiusKm: 10 }
    ),
    false
  );
});

test("3. offline outside specialist radius → not found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, distanceKm: 12, serviceRadiusKm: 10 },
      { pRadiusKm: 25 }
    ),
    false
  );
});

test("4. hybrid local → found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, workFormat: "hybrid", distanceKm: 5 },
      { pRadiusKm: 10 }
    ),
    true
  );
});

test("5. online → not found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, workFormat: "online", distanceKm: 1 },
      { pRadiusKm: 25 }
    ),
    false
  );
});

test("6. null radius → not found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, serviceRadiusKm: null, distanceKm: 1 },
      { pRadiusKm: 25 }
    ),
    false
  );
});

test("7. radius 30/200/1000 → not found", () => {
  for (const bad of [30, 200, 1000]) {
    assert.equal(isAllowedServiceRadiusKm(bad), false);
    assert.equal(
      matchesLocalRadiusRpcV2(
        { ...base, serviceRadiusKm: bad, distanceKm: 1 },
        { pRadiusKm: 100 }
      ),
      false
    );
  }
});

test("8. null coords → not found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, lat: null, lng: null },
      { pRadiusKm: 25 }
    ),
    false
  );
});

test("9. 0,0 → not found", () => {
  assert.equal(
    matchesLocalRadiusRpcV2({ ...base, lat: 0, lng: 0 }, { pRadiusKm: 25 }),
    false
  );
});

test("10. language filter", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, languages: ["de"] },
      { pRadiusKm: 25, pLang: "ru" }
    ),
    false
  );
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, languages: ["ru", "de"] },
      { pRadiusKm: 25, pLang: "ru" }
    ),
    true
  );
});

test("11. category filter", () => {
  assert.equal(
    matchesLocalRadiusRpcV2(base, { pRadiusKm: 25, pCategoryId: "cat-b" }),
    false
  );
  assert.equal(
    matchesLocalRadiusRpcV2(base, { pRadiusKm: 25, pCategoryId: "cat-a" }),
    true
  );
});

test("12. ranking distance / is_pro / rating / id", () => {
  const ranked = rankLocalRows([
    { id: "b", distanceKm: 5, isPro: true, rating: 3 },
    { id: "a", distanceKm: 5, isPro: true, rating: 4 },
    { id: "c", distanceKm: 5, isPro: false, rating: 5 },
    { id: "d", distanceKm: 1, isPro: false, rating: null },
    { id: "e", distanceKm: 5, isPro: true, rating: null },
  ]);
  assert.deepEqual(
    ranked.map((r) => r.id),
    ["d", "a", "b", "e", "c"]
  );
});

test("13. pagination normalize", () => {
  assert.deepEqual(normalizePagination(-5, null), { offset: 0, limit: 20 });
  assert.deepEqual(normalizePagination(null, 20), { offset: 0, limit: 20 });
  assert.deepEqual(normalizePagination(10, 0), { offset: 10, limit: 0 });
  assert.deepEqual(normalizePagination(2, -3), { offset: 2, limit: 0 });
  assert.deepEqual(normalizePagination(0, 50), { offset: 0, limit: 50 });
});

test("14. p_mode null → offline+hybrid", () => {
  assert.equal(modeAllowsWorkFormat(null, "offline"), true);
  assert.equal(modeAllowsWorkFormat(null, "hybrid"), true);
  assert.equal(modeAllowsWorkFormat(null, "online"), false);
});

test("15. p_mode offline", () => {
  assert.equal(modeAllowsWorkFormat("offline", "offline"), true);
  assert.equal(modeAllowsWorkFormat("offline", "hybrid"), false);
});

test("16. p_mode hybrid", () => {
  assert.equal(modeAllowsWorkFormat("hybrid", "hybrid"), true);
  assert.equal(modeAllowsWorkFormat("hybrid", "offline"), false);
});

test("17. p_mode online → empty set", () => {
  assert.equal(modeAllowsWorkFormat("online", "online"), false);
  assert.equal(modeAllowsWorkFormat("online", "offline"), false);
  assert.equal(
    matchesLocalRadiusRpcV2(
      { ...base, workFormat: "online" },
      { pRadiusKm: 25, pMode: "online" }
    ),
    false
  );
});

test("p_mode local → offline+hybrid; unknown → empty", () => {
  assert.equal(modeAllowsWorkFormat("local", "offline"), true);
  assert.equal(modeAllowsWorkFormat("local", "hybrid"), true);
  assert.equal(modeAllowsWorkFormat("weird", "offline"), false);
});

test("RPC output must not require service_radius_km column", () => {
  // Contract return columns (order):
  const cols = [
    "id",
    "name",
    "postal_code",
    "lat",
    "lng",
    "work_format",
    "category_id",
    "languages",
    "is_pro",
    "rating",
    "distance",
  ];
  assert.equal(cols.includes("service_radius_km"), false);
  assert.equal(cols.length, 11);
});

test("migration v2 projection uses specialists.is_pro and specialists.rating", () => {
  const sql = readFileSync(MIGRATION_V2, "utf8");
  const body = extractFunctionBody(sql);

  assert.match(body, /s\.is_pro/);
  assert.match(body, /s\.rating/);
  assert.match(
    body,
    /ORDER BY\s+d\.dist ASC,\s*s\.is_pro DESC,\s*s\.rating DESC NULLS LAST,\s*s\.id ASC/s
  );

  assert.doesNotMatch(body, /is_featured/);
  assert.doesNotMatch(body, /rating_avg/);
  assert.doesNotMatch(body, /specialist_rating_stats/);
  assert.doesNotMatch(body, /LEFT JOIN/);

  // Return column order in RETURNS TABLE
  assert.match(
    sql,
    /RETURNS TABLE \(\s*id uuid,\s*name text,\s*postal_code text,\s*lat double precision,\s*lng double precision,\s*work_format text,\s*category_id uuid,\s*languages text\[\],\s*is_pro boolean,\s*rating numeric,\s*distance double precision\s*\)/s
  );

  // Geo filters present; projection still s.is_pro / s.rating
  assert.match(body, /service_radius_km IN \(5, 10, 25, 50, 100\)/);
  assert.match(body, /work_format IN \('offline', 'hybrid'\)/);
});

test("rollback restores production projection without rating joins", () => {
  const sql = readFileSync(ROLLBACK_V2, "utf8");
  const body = extractFunctionBody(sql);

  assert.match(body, /s\.is_pro/);
  assert.match(body, /s\.rating/);
  assert.match(
    body,
    /ORDER BY\s+d\.dist ASC,\s*s\.is_pro DESC,\s*s\.rating DESC NULLS LAST/s
  );
  assert.doesNotMatch(body, /is_featured/);
  assert.doesNotMatch(body, /rating_avg/);
  assert.doesNotMatch(body, /specialist_rating_stats/);
  assert.doesNotMatch(body, /LEFT JOIN/);
  // production ranking has no id tie-breaker
  assert.doesNotMatch(body, /s\.id ASC/);
});
