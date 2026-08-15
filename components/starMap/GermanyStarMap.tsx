"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary, Lang } from "@/lib/i18n";
import { tCount } from "@/lib/i18n";
import StarMapMarker from "@/components/starMap/StarMapMarker";
import StarMapTooltip from "@/components/starMap/StarMapTooltip";
import {
  EUROPE_STAR_MAP_BOUNDS,
  EUROPE_STAR_MAP_VIEWBOX,
} from "@/lib/starMap/constants";
import { projectStarMapCities } from "@/lib/starMap/clusterStarMapPoints";
import {
  containPointInSilhouette,
  EUROPE_GERMANY_POLYGON,
  EUROPE_STAR_MAP_INSET,
  percentToViewBox,
} from "@/lib/starMap/projectCoordinates";
import type { StarMapMarkerPoint, StarMapSummary } from "@/lib/starMap/types";

const EUROPE_MAP_VIEWBOX = `0 0 ${EUROPE_STAR_MAP_VIEWBOX.width} ${EUROPE_STAR_MAP_VIEWBOX.height}`;

type GermanyStarMapProps = {
  data: StarMapSummary;
  dict: Dictionary;
  lang: Lang;
  className?: string;
};

export default function GermanyStarMap({
  data,
  dict,
  lang,
  className,
}: GermanyStarMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const markers: StarMapMarkerPoint[] = useMemo(
    () =>
      projectStarMapCities(data.cities, EUROPE_STAR_MAP_BOUNDS).map((point) => {
        const view = percentToViewBox(point.x, point.y, EUROPE_STAR_MAP_VIEWBOX);
        const safe = containPointInSilhouette(view.x, view.y, {
          polygon: EUROPE_GERMANY_POLYGON,
          margin: EUROPE_STAR_MAP_INSET,
        });
        return { ...point, x: safe.x, y: safe.y };
      }),
    [data.cities],
  );

  const activeMarker = markers.find((marker) => marker.id === activeId) ?? null;

  const dismiss = useCallback(() => setActiveId(null), []);

  useEffect(() => {
    if (!activeId) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(event.target as Node)) dismiss();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeId, dismiss]);

  const tooltipPosition = useMemo(() => {
    if (!activeMarker) return null;
    const xPercent =
      (activeMarker.x / EUROPE_STAR_MAP_VIEWBOX.width) * 100;
    const yPercent =
      (activeMarker.y / EUROPE_STAR_MAP_VIEWBOX.height) * 100;
    const flipX = xPercent > 68;
    const flipY = yPercent > 72;
    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
      transform: `translate(${flipX ? "-108%" : "12px"}, ${flipY ? "-115%" : "12px"})`,
    };
  }, [activeMarker]);

  const tooltipId = activeMarker ? `star-map-tooltip-${activeMarker.id}` : undefined;

  return (
    <div
      ref={rootRef}
      className={`relative w-full ${className ?? ""}`}
    >
      <div
        className="relative mx-auto aspect-[850/680] w-full max-w-[340px] md:max-w-[420px] lg:mx-0 lg:aspect-auto lg:h-[680px] lg:max-w-[850px]"
      >
        <svg
          viewBox={EUROPE_MAP_VIEWBOX}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={tCount(dict, lang, "home.starMap.counter", data.total)}
        >
          <image
            href="/images/star-map/europe-context.svg"
            width={EUROPE_STAR_MAP_VIEWBOX.width}
            height={EUROPE_STAR_MAP_VIEWBOX.height}
            preserveAspectRatio="none"
          />
          {markers.map((marker, index) => (
            <StarMapMarker
              key={marker.id}
              marker={marker}
              index={index}
              isActive={activeId === marker.id}
              reduceMotion={reduceMotion}
              viewBoxWidth={EUROPE_STAR_MAP_VIEWBOX.width}
              ariaLabel={`${marker.city}: ${tCount(dict, lang, "home.starMap.specialists", marker.count)}`}
              onActivate={setActiveId}
              onDeactivate={() => {
                if (activeId === marker.id) dismiss();
              }}
            />
          ))}
        </svg>

        {activeMarker && tooltipPosition && tooltipId ? (
          <StarMapTooltip
            id={tooltipId}
            dict={dict}
            lang={lang}
            marker={activeMarker}
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
              transform: tooltipPosition.transform,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
