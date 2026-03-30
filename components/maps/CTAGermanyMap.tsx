"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const GERMANY_CENTER: [number, number] = [10.45, 51.16];
const ZOOM = 5.7;

const STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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

    if (/poi|label_(?!place|country)/.test(id) && !/place|country/.test(id)) {
      if (id.includes("poi")) {
        map.setLayoutProperty(id, "visibility", "none");
        continue;
      }
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
        } else if (id.includes("land") || id.includes("park") || id.includes("building")) {
          map.setPaintProperty(id, "fill-color", BG_MID);
        }
      }
    }

    if (layer.type === "line") {
      if (id.includes("boundary") || id.includes("border") || id.includes("admin")) {
        map.setPaintProperty(id, "line-color", BORDER);
        map.setPaintProperty(id, "line-opacity", 0.6);
      } else if (id.includes("motorway") || id.includes("trunk") || id.includes("primary")) {
        map.setPaintProperty(id, "line-color", ROAD_MAIN);
      } else if (id.includes("road") || id.includes("secondary") || id.includes("tertiary") || id.includes("street")) {
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

export default function CTAGermanyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: GERMANY_CENTER,
      zoom: ZOOM,
      minZoom: ZOOM,
      maxZoom: ZOOM,
      attributionControl: false,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      dragRotate: false,
      keyboard: false,
      touchZoomRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      interactive: false,
    });

    map.on("load", () => tuneStyle(map));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 320 }}
    />
  );
}
