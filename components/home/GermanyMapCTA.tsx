"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MapPoint = { lat: number; lng: number; city: string | null };

const LAT_MIN = 47.2;
const LAT_MAX = 55.1;
const LNG_MIN = 5.9;
const LNG_MAX = 15.0;

const MAP_W = 360;
const MAP_H = 450;

function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H,
  };
}

// Simplified but recognizable Germany silhouette
const GERMANY_PATH =
  "M168,12 L180,10 195,14 210,20 228,18 240,22 255,30 268,28 " +
  "280,35 290,45 298,58 305,72 310,88 315,100 318,115 " +
  "320,130 325,148 330,165 328,180 325,195 320,210 " +
  "318,228 322,245 328,258 332,272 328,288 320,302 " +
  "312,315 308,328 312,342 318,355 322,368 315,382 " +
  "305,395 295,408 282,418 268,425 255,432 240,438 " +
  "225,442 210,445 195,442 180,438 165,432 " +
  "150,425 138,415 125,405 115,392 108,378 " +
  "102,362 95,348 90,332 85,318 82,302 " +
  "80,288 78,272 82,258 85,242 88,228 " +
  "90,212 92,198 95,182 98,168 102,152 " +
  "105,138 110,122 115,108 122,95 130,82 " +
  "138,68 148,55 155,42 162,28 Z";

const CITY_GLOWS = [
  { x: 262, y: 108, r: 45 },
  { x: 125, y: 205, r: 38 },
  { x: 218, y: 395, r: 32 },
  { x: 175, y: 58, r: 32 },
];

type Props = {
  title: string;
  subtitle: string;
  body: string;
  spark: string;
  button: string;
  lang: string;
};

export default function GermanyMapCTA({ title, subtitle, body, spark, button, lang }: Props) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/map/points")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && Array.isArray(json?.data)) setPoints(json.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const cities = points
    .map((p) => p.city)
    .filter((c): c is string => !!c && c.trim().length > 0);
  const uniqueCities = Array.from(new Set(cities)).slice(0, 3);

  const dynamicText =
    uniqueCities.length >= 1
      ? subtitle.replace("{{cities}}", uniqueCities.join(", "))
      : null;

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

          {/* Map card */}
          <div className="relative w-full md:w-[45%] shrink-0">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-[#0B1220] group cursor-default select-none transition-transform duration-500 hover:scale-[1.015]">
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                className="absolute inset-0 w-full h-full"
                aria-hidden
              >
                <defs>
                  {CITY_GLOWS.map((_, i) => (
                    <radialGradient key={i} id={`mg-${i}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#4FD1C5" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#4FD1C5" stopOpacity="0" />
                    </radialGradient>
                  ))}
                  <filter id="dg">
                    <feGaussianBlur stdDeviation="2.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Germany outline */}
                <path
                  d={GERMANY_PATH}
                  fill="rgba(255,255,255,0.02)"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />

                {/* Ambient city glow */}
                {CITY_GLOWS.map((g, i) => (
                  <circle
                    key={i}
                    cx={g.x}
                    cy={g.y}
                    r={g.r}
                    fill={`url(#mg-${i})`}
                    className="transition-opacity duration-700 group-hover:opacity-125"
                  />
                ))}

                {/* Specialist dots */}
                {points.map((p, i) => {
                  const { x, y } = project(p.lat, p.lng);
                  const isLast = i === points.length - 1;
                  const delay = i * 70;

                  return (
                    <g key={i} filter="url(#dg)">
                      <circle
                        cx={x}
                        cy={y}
                        r={isLast ? 4.5 : 3}
                        fill={isLast ? "#00E0FF" : "#4FD1C5"}
                        className="transition-all duration-700"
                        style={{
                          transitionDelay: `${delay}ms`,
                          opacity: visible ? (isLast ? 1 : 0.8) : 0,
                        }}
                      >
                        {isLast && (
                          <animate
                            attributeName="r"
                            values="0;6;4.5"
                            dur="1s"
                            begin={`${delay}ms`}
                            fill="freeze"
                          />
                        )}
                      </circle>
                      <circle
                        cx={x}
                        cy={y}
                        r="3"
                        fill="none"
                        stroke={isLast ? "#00E0FF" : "#4FD1C5"}
                        strokeWidth="0.4"
                        opacity="0"
                      >
                        <animate
                          attributeName="r"
                          values="3;14"
                          dur="3.5s"
                          begin={`${delay + 600}ms`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.4;0"
                          dur="3.5s"
                          begin={`${delay + 600}ms`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* CTA Text */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">
              {title}
            </h2>

            {dynamicText && (
              <p className="mt-4 text-teal-600 text-sm md:text-base font-medium">
                {dynamicText}
              </p>
            )}

            <p className="mt-4 text-gray-600 text-base md:text-lg leading-relaxed max-w-md">
              {body}
            </p>

            <p className="mt-3 text-gray-400 text-sm italic">
              {spark}
            </p>

            <Link
              href={`/${lang}/become-specialist`}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-teal-600 px-8 text-sm font-semibold text-white transition-all duration-300 hover:bg-teal-700 hover:shadow-lg"
            >
              {button}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
