"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary, Lang } from "@/lib/i18n";
import { tCount } from "@/lib/i18n";
import GermanySilhouettePath, {
  GERMANY_SILHOUETTE_VIEWBOX,
} from "@/components/starMap/GermanySilhouette";
import StarMapMarker from "@/components/starMap/StarMapMarker";
import StarMapTooltip from "@/components/starMap/StarMapTooltip";
import { GERMANY_STAR_MAP_BOUNDS, GERMANY_STAR_MAP_VIEWBOX } from "@/lib/starMap/constants";
import { projectStarMapCities } from "@/lib/starMap/clusterStarMapPoints";
import { percentToViewBox } from "@/lib/starMap/projectCoordinates";
import type { StarMapMarkerPoint, StarMapSummary } from "@/lib/starMap/types";

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
      projectStarMapCities(data.cities, GERMANY_STAR_MAP_BOUNDS).map((point) => {
        const view = percentToViewBox(point.x, point.y, GERMANY_STAR_MAP_VIEWBOX);
        return { ...point, x: view.x, y: view.y };
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
    const xPercent = (activeMarker.x / GERMANY_STAR_MAP_VIEWBOX.width) * 100;
    const yPercent = (activeMarker.y / GERMANY_STAR_MAP_VIEWBOX.height) * 100;
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
      className={`relative mx-auto w-full max-w-[340px] md:max-w-[520px] ${className ?? ""}`}
    >
      <div className="relative aspect-square w-full">
        <svg
          viewBox={GERMANY_SILHOUETTE_VIEWBOX}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={tCount(dict, lang, "home.starMap.counter", data.total)}
        >
          <GermanySilhouettePath />
          {markers.map((marker, index) => (
            <StarMapMarker
              key={marker.id}
              marker={marker}
              index={index}
              isActive={activeId === marker.id}
              reduceMotion={reduceMotion}
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
