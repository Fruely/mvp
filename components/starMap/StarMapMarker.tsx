"use client";

import { dotSizeForCount } from "@/lib/starMap/projectCoordinates";
import type { StarMapRenderable } from "@/lib/starMap/types";

type StarMapMarkerProps = {
  marker: StarMapRenderable;
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
  const isCluster = marker.kind === "cluster";
  const radius = isCluster ? 7 : dotSizeForCount(marker.count) / 2;
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
          r={radius * 1.6}
          fill="none"
          stroke="#5ECEC3"
          strokeWidth="0.35"
          className="star-map-pulse"
          opacity="0.8"
        />
      ) : null}
      <circle
        role="button"
        tabIndex={0}
        r={radius}
        fill="#5ECEC3"
        className="cursor-pointer transition-[transform] duration-200 ease-out focus:outline-none"
        style={{
          filter: "drop-shadow(0 0 12px rgba(94, 206, 195, 0.6))",
        }}
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
      {isCluster ? (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill="#0D2B2A"
          fontSize="4.5"
          fontWeight="700"
          pointerEvents="none"
        >
          {marker.count}
        </text>
      ) : null}
    </g>
  );
}
