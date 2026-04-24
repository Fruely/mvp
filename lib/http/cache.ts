import { NextResponse } from "next/server";

/** Filters / high-churn reference data */
export const CACHE_PUBLIC_FILTERS =
  "public, s-maxage=120, stale-while-revalidate=600";

/** Homepage popular categories, specialists category tree */
export const CACHE_PUBLIC_POPULAR_CATEGORIES =
  "public, s-maxage=300, stale-while-revalidate=1800";

/** Homepage recommended grid (seeded daily / half-day) */
export const CACHE_PUBLIC_RECOMMENDED =
  "public, s-maxage=300, stale-while-revalidate=3600";

/** Same TTL as popular categories — category counts + hierarchy */
export const CACHE_PUBLIC_SPECIALISTS_CATEGORIES =
  "public, s-maxage=300, stale-while-revalidate=1800";

type JsonInit = ResponseInit;

export function jsonWithCache(body: unknown, cacheControl: string, init: JsonInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Cache-Control": cacheControl,
    },
  });
}
