"use client";

import { svgDotRadiusForCount } from "@/lib/starMap/projectCoordinates";
import type { StarMapMarkerPoint } from "@/lib/starMap/types";

type StarMapMarkerProps = {
  marker: StarMapMarkerPoint;
  index: number;
  isActive: boolean;
  reduceMotion: boolean;
  viewBoxWidth?: number;
  onActivate: (id: string) => void;
  onDeactivate: () => void;
  ariaLabel: string;
};

/** ~22px tap target at a 520px-wide rendered map. */
function hitRadius(viewBoxWidth: number) {
  return (viewBoxWidth * 22) / 520;
}

export default function StarMapMarker({
  marker,
  index,
  isActive,
  reduceMotion,
  viewBoxWidth = 500,
  onActivate,
  onDeactivate,
  ariaLabel,
}: StarMapMarkerProps) {
  const radius = svgDotRadiusForCount(marker.count);
  const hitR = hitRadius(viewBoxWidth);
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
        r={hitR}
        fill="transparent"
        className="cursor-pointer focus:outline-none"
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
      <circle
        r={radius}
        fill="#5ECEC3"
        pointerEvents="none"
        style={{ filter: "drop-shadow(0 0 6px rgba(94, 206, 195, 0.65))" }}
      />
    </g>
  );
}
