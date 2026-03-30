"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MapPoint = { lat: number; lng: number; city: string | null };

const LAT_MIN = 47.2;
const LAT_MAX = 55.1;
const LNG_MIN = 5.9;
const LNG_MAX = 15.0;

const MAP_W = 400;
const MAP_H = 500;

function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H,
  };
}

const GERMANY_OUTLINE =
  "M200,10 L230,18 260,30 285,55 300,80 310,105 320,135 325,165 330,195 " +
  "335,230 340,260 330,290 315,320 305,345 310,370 320,395 310,420 " +
  "290,440 265,455 240,465 215,470 190,475 165,465 145,450 125,440 " +
  "110,420 100,395 95,370 85,345 80,320 75,290 80,260 85,230 " +
  "90,200 95,170 100,140 110,115 125,90 145,65 165,40 185,20 Z";

const CITY_GLOWS = [
  { x: 260, y: 105, r: 50, label: "Berlin" },
  { x: 120, y: 200, r: 40, label: "NRW" },
  { x: 225, y: 420, r: 35, label: "München" },
  { x: 170, y: 60, r: 35, label: "Hamburg" },
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
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const cities = points
    .map((p) => p.city)
    .filter((c): c is string => !!c && c.trim().length > 0);
  const uniqueCities = Array.from(new Set(cities)).slice(0, 3);

  const dynamicText =
    uniqueCities.length === 1
      ? subtitle.replace("{{cities}}", uniqueCities[0])
      : uniqueCities.length > 1
        ? subtitle.replace("{{cities}}", uniqueCities.join(", "))
        : null;

  return (
    <section className="relative overflow-hidden bg-[#05070D] py-16 md:py-24">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

          {/* Map */}
          <div className="relative w-full max-w-[420px] aspect-[4/5] shrink-0 group cursor-default select-none transition-transform duration-500 hover:scale-[1.02]">
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              className="absolute inset-0 w-full h-full"
              aria-hidden
            >
              <defs>
                <radialGradient id="bg-grad" cx="50%" cy="40%" r="70%">
                  <stop offset="0%" stopColor="#101726" />
                  <stop offset="100%" stopColor="#05070D" />
                </radialGradient>
                {CITY_GLOWS.map((g, i) => (
                  <radialGradient key={i} id={`glow-${i}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#4FD1C5" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#4FD1C5" stopOpacity="0" />
                  </radialGradient>
                ))}
                <filter id="dot-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width={MAP_W} height={MAP_H} fill="url(#bg-grad)" />

              {/* Germany outline */}
              <path
                d={GERMANY_OUTLINE}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1.5"
              />

              {/* City ambient glow */}
              {CITY_GLOWS.map((g, i) => (
                <circle
                  key={`city-glow-${i}`}
                  cx={g.x}
                  cy={g.y}
                  r={g.r}
                  fill={`url(#glow-${i})`}
                  className="transition-opacity duration-500 group-hover:opacity-150"
                />
              ))}

              {/* Specialist dots */}
              {points.map((p, i) => {
                const { x, y } = project(p.lat, p.lng);
                const isLast = i === points.length - 1;
                const delay = i * 80;

                return (
                  <g key={i} filter="url(#dot-glow)">
                    <circle
                      cx={x}
                      cy={y}
                      r={isLast ? 4 : 3}
                      fill={isLast ? "#00E0FF" : "#4FD1C5"}
                      opacity={visible ? 1 : 0}
                      className="transition-all duration-700 group-hover:opacity-100"
                      style={{
                        transitionDelay: `${delay}ms`,
                        opacity: visible ? (isLast ? 1 : 0.85) : 0,
                      }}
                    >
                      <animate
                        attributeName="r"
                        values={isLast ? "0;5;4" : `${3};${3};${3}`}
                        dur={isLast ? "1.2s" : "0s"}
                        begin={`${delay}ms`}
                        fill="freeze"
                      />
                    </circle>
                    {/* Pulse ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r="3"
                      fill="none"
                      stroke="#4FD1C5"
                      strokeWidth="0.5"
                      opacity="0"
                    >
                      <animate
                        attributeName="r"
                        values="3;12"
                        dur="3s"
                        begin={`${delay + 500}ms`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.5;0"
                        dur="3s"
                        begin={`${delay + 500}ms`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* CTA Text */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
              {title}
            </h2>

            {dynamicText && (
              <p className="mt-4 text-[#4FD1C5] text-sm md:text-base font-medium">
                {dynamicText}
              </p>
            )}

            <p className="mt-4 text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
              {body}
            </p>

            <p className="mt-3 text-gray-500 text-sm italic">
              {spark}
            </p>

            <Link
              href={`/${lang}/become-specialist`}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-[#4FD1C5] px-8 text-sm font-semibold text-[#05070D] transition-all duration-300 hover:bg-[#38B2AC] hover:shadow-[0_0_24px_rgba(79,209,197,0.3)]"
            >
              {button}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
