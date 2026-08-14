export type StarMapCity = {
  city: string;
  lat: number;
  lng: number;
  count: number;
  recentCount: number;
};

export type StarMapSummary = {
  total: number;
  cities: StarMapCity[];
  /** Eligible public specialists matching visibility rules. */
  eligibleCount: number;
  /** Specialists represented on the map (with city + coordinates). */
  representedCount: number;
  /** Eligible specialists missing city or coordinates after PLZ lookup. */
  missingCoordinatesCount: number;
};

export type StarMapProjectionBounds = {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
};

export type ProjectedStarMapPoint = {
  city: string;
  lat: number;
  lng: number;
  count: number;
  recentCount: number;
  x: number;
  y: number;
};

export type StarMapCluster = {
  kind: "cluster";
  id: string;
  city: string;
  lat: number;
  lng: number;
  count: number;
  recentCount: number;
  x: number;
  y: number;
  memberCount: number;
};

export type StarMapMarkerPoint = {
  kind: "point";
  id: string;
  city: string;
  lat: number;
  lng: number;
  count: number;
  recentCount: number;
  x: number;
  y: number;
};

export type StarMapRenderable = StarMapMarkerPoint | StarMapCluster;
