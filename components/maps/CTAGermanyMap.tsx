"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-points.css";

const STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const GERMANY_BOUNDS: [[number, number], [number, number]] = [
  [5.8, 47.2],
  [15.1, 55.1],
];

const FIT_PADDING = { top: 32, bottom: 32, left: 24, right: 24 };

/* ---------- dark-blue style tuning ---------- */

const BG_DEEP = "#0a1628";
const BG_MID = "#0f1d33";
const WATER = "#0c1a30";
const ROAD_MAIN = "#1a2d4a";
const ROAD_MINOR = "#13243e";
const BORDER = "#2a4060";
const LABEL_CITY = "#c8d6e5";
const LABEL_COUNTRY = "#5a7a9a";

function tuneStyle(map: maplibregl.Map) {
  const layers = map.getStyle().layers ?? [];

  for (const layer of layers) {
    const id = layer.id;

    if (id.includes("poi")) {
      map.setLayoutProperty(id, "visibility", "none");
      continue;
    }

    if (layer.type === "background") {
      map.setPaintProperty(id, "background-color", BG_DEEP);
      continue;
    }

    if (layer.type === "fill") {
      const paint = (layer as maplibregl.FillLayerSpecification).paint;
      const color = paint?.["fill-color"];
      if (typeof color === "string") {
        if (id.includes("water") || id.includes("ocean")) {
          map.setPaintProperty(id, "fill-color", WATER);
        } else if (
          id.includes("land") ||
          id.includes("park") ||
          id.includes("building")
        ) {
          map.setPaintProperty(id, "fill-color", BG_MID);
        }
      }
    }

    if (layer.type === "line") {
      if (
        id.includes("boundary") ||
        id.includes("border") ||
        id.includes("admin")
      ) {
        map.setPaintProperty(id, "line-color", BORDER);
        map.setPaintProperty(id, "line-opacity", 0.6);
      } else if (
        id.includes("motorway") ||
        id.includes("trunk") ||
        id.includes("primary")
      ) {
        map.setPaintProperty(id, "line-color", ROAD_MAIN);
      } else if (
        id.includes("road") ||
        id.includes("secondary") ||
        id.includes("tertiary") ||
        id.includes("street")
      ) {
        map.setPaintProperty(id, "line-color", ROAD_MINOR);
      }
    }

    if (layer.type === "symbol") {
      if (id.includes("place") && !id.includes("country")) {
        map.setPaintProperty(id, "text-color", LABEL_CITY);
        map.setPaintProperty(id, "text-halo-color", "rgba(10,22,40,0.9)");
        map.setPaintProperty(id, "text-halo-width", 1.5);
      } else if (id.includes("country")) {
        map.setPaintProperty(id, "text-color", LABEL_COUNTRY);
      }
    }
  }
}

/* ---------- DOM dot helpers ---------- */

function createDot(isNewest: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "map-point" + (isNewest ? " newest" : "");

  const glow = document.createElement("div");
  glow.className = "map-point__glow";

  const core = document.createElement("div");
  core.className = "map-point__core";

  const pulse = document.createElement("div");
  pulse.className = "map-point__pulse";

  el.appendChild(glow);
  el.appendChild(core);
  el.appendChild(pulse);

  return el;
}

function positionDot(
  el: HTMLDivElement,
  map: maplibregl.Map,
  lng: number,
  lat: number,
) {
  const { x, y } = map.project([lng, lat]);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

/* ---------- component ---------- */

type PointData = { id: string; lat: number; lng: number };

export default function CTAGermanyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dotsRef = useRef<{ el: HTMLDivElement; lng: number; lat: number }[]>(
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:5;pointer-events:none;";
    container.appendChild(overlay);
    overlayRef.current = overlay;

    const map = new maplibregl.Map({
      container,
      style: STYLE_URL,
      bounds: GERMANY_BOUNDS,
      fitBoundsOptions: { padding: FIT_PADDING },
      attributionControl: false,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", () => tuneStyle(map));

    map.once("idle", () => {
      const zoom = map.getZoom();
      map.setMinZoom(zoom);
      map.setMaxZoom(zoom);

      fetch("/api/map/points")
        .then((r) => r.json())
        .then((json) => {
          const pts: PointData[] = json.data ?? [];
          if (!pts.length) return;

          const lastIdx = pts.length - 1;

          pts.forEach((pt, i) => {
            const isNewest = i === lastIdx;
            const dot = createDot(isNewest);
            positionDot(dot, map, pt.lng, pt.lat);
            overlay.appendChild(dot);
            dotsRef.current.push({ el: dot, lng: pt.lng, lat: pt.lat });

            const delay = isNewest ? lastIdx * 80 + 1600 : i * 80;
            setTimeout(() => dot.classList.add("visible"), delay);
          });
        })
        .catch(() => {});
    });

    const ro = new ResizeObserver(() => {
      map.resize();
      dotsRef.current.forEach((d) => positionDot(d.el, map, d.lng, d.lat));
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      dotsRef.current = [];
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: "relative", minHeight: 320 }}
    />
  );
}
