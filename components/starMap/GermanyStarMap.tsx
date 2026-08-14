"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary, Lang } from "@/lib/i18n";
import { tCount } from "@/lib/i18n";
import GermanySilhouette from "@/components/starMap/GermanySilhouette";
import StarMapMarker from "@/components/starMap/StarMapMarker";
import StarMapTooltip from "@/components/starMap/StarMapTooltip";
import { GERMANY_STAR_MAP_BOUNDS } from "@/lib/starMap/constants";
import { clusterStarMapPoints } from "@/lib/starMap/clusterStarMapPoints";
import type { StarMapSummary } from "@/lib/starMap/types";

type GermanyStarMapProps = {
  data: StarMapSummary;
  dict: Dictionary;
  lang: Lang;
  className?: string;
};

const MAP_SIZE_PX = 520;

export default function GermanyStarMap({
  data,
  dict,
  lang,
  className,
}: GermanyStarMapProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mapWidth, setMapWidth] = useState(MAP_SIZE_PX);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setMapWidth(width);
    });
    observer.observe(node);
    setMapWidth(node.getBoundingClientRect().width || MAP_SIZE_PX);
    return () => observer.disconnect();
  }, []);

  const markers = useMemo(
    () =>
      clusterStarMapPoints(data.cities, {
        bounds: GERMANY_STAR_MAP_BOUNDS,
        mapWidthPx: mapWidth,
        mapHeightPx: mapWidth,
      }),
    [data.cities, mapWidth],
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
    const left = `${activeMarker.x}%`;
    const top = `${activeMarker.y}%`;
    const flipX = activeMarker.x > 68;
    const flipY = activeMarker.y > 72;
    return {
      left,
      top,
      transform: `translate(${flipX ? "-108%" : "8%"}, ${flipY ? "-115%" : "8%"})`,
    };
  }, [activeMarker]);

  const tooltipId = activeMarker ? `star-map-tooltip-${activeMarker.id}` : undefined;

  return (
    <div ref={rootRef} className={`relative mx-auto w-full max-w-[520px] ${className ?? ""}`}>
      <div className="relative aspect-square w-full">
        <GermanySilhouette className="absolute inset-[4%] h-[92%] w-[92%]" />
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden={markers.length === 0}
        >
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
