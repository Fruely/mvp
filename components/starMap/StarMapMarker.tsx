"use client";

import { svgDotRadiusForCount } from "@/lib/starMap/projectCoordinates";
import type { StarMapMarkerPoint } from "@/lib/starMap/types";

type StarMapMarkerProps = {
  marker: StarMapMarkerPoint;
  index: number;
  isActive: boolean;
  reduceMotion: boolean;
  onActivate: (id: string) => void;
  onDeactivate: () => void;
  ariaLabel: string;
};

export default function StarMapMarker({
  marker,
  index,
  isActive,
  reduceMotion,
  onActivate,
  onDeactivate,
  ariaLabel,
}: StarMapMarkerProps) {
  const radius = svgDotRadiusForCount(marker.count);
  const hasPulse = marker.recentCount > 0 && !reduceMotion;
  const delay = reduceMotion ? 0 : index * 0.04;
  const scale = isActive ? 1.4 : 1;

  return (
    <g
      transform={`translate(${marker.x} ${marker.y}) scale(${scale})`}
      className={reduceMotion ? undefined : "star-map-marker-enter"}
      style={
        reduceMotion
          ? undefined
          : ({ animationDelay: `${delay}s` } as React.CSSProperties)
      }
    >
      {hasPulse ? (
        <circle
          r={radius + 4}
          fill="none"
          stroke="#5ECEC3"
          strokeWidth="1.2"
          className="star-map-pulse"
          pointerEvents="none"
        />
      ) : null}
      <circle
        role="button"
        tabIndex={0}
        r={radius}
        fill="#5ECEC3"
        className="cursor-pointer focus:outline-none"
        style={{ filter: "drop-shadow(0 0 6px rgba(94, 206, 195, 0.65))" }}
        aria-label={ariaLabel}
        aria-expanded={isActive}
        onMouseEnter={() => onActivate(marker.id)}
        onMouseLeave={onDeactivate}
        onFocus={() => onActivate(marker.id)}
        onBlur={onDeactivate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onActivate(marker.id);
          }
          if (event.key === "Escape") {
            onDeactivate();
          }
        }}
        onClick={() => onActivate(marker.id)}
      />
    </g>
  );
}
