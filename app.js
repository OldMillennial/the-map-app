// Remove sketch

import * as d3 from "https://esm.sh/d3@7";
import { feature, mesh } from "https://esm.sh/topojson-client@3";
import * as d3GeoProjection from "https://esm.sh/d3-geo-projection@4";
import Papa from "https://esm.sh/papaparse@5.4.1";

const DATA_SOURCES = {
  countries: {
    "110m": "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json",
    "50m": "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json",
    "10m": "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-10m.json",
  },
  iso: "./data/iso-3166-1.json",
  disputed: "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_breakaway_disputed_areas.geojson",
};

const mapSvg = d3.select("#map");
const tooltip = document.querySelector("#tooltip");
const textEditor = document.querySelector("#text-editor");
const mapWrap = document.querySelector(".map-wrap");

const ui = {
  countrySearch: document.querySelector("#country-search"),
  countryResults: document.querySelector("#country-results"),

  hideFromSearch: document.querySelector("#hide-from-search"),
  selectionSummary: document.querySelector("#selection-summary"),
  clearSelection: document.querySelector("#clear-selection"),
  selectedCountryList: document.querySelector("#selected-country-list"),
  clearCountryOverrides: document.querySelector("#clear-country-overrides"),
  selectedFill: document.querySelector("#selected-fill"),
  applySelectedFill: document.querySelector("#apply-selected-fill"),
  nonSelectedFill: document.querySelector("#nonselected-fill"),
  nonSelectedOpacity: document.querySelector("#nonselected-opacity"),
  countryStroke: document.querySelector("#country-stroke"),
  countryStrokeWidth: document.querySelector("#country-stroke-width"),
  countryBordersEnabled: document.querySelector("#country-borders-enabled"),
  coastStroke: document.querySelector("#coast-stroke"),
  coastStrokeWidth: document.querySelector("#coast-stroke-width"),
  coastBordersEnabled: document.querySelector("#coast-borders-enabled"),
  noDataFill: document.querySelector("#nodata-fill"),
  resetColors: document.querySelector("#reset-colors"),
  resetAll: document.querySelector("#reset-all"),
  groupList: document.querySelector("#group-list"),
  addGroup: document.querySelector("#add-group"),
  hideSelected: document.querySelector("#hide-selected"),
  isolateSelected: document.querySelector("#isolate-selected"),
  hideNoData: document.querySelector("#hide-nodata"),
  unhideAll: document.querySelector("#unhide-all"),
  csvInput: document.querySelector("#csv-input"),
  scaleMode: document.querySelector("#scale-mode"),
  bucketCount: document.querySelector("#bucket-count"),
  minValue: document.querySelector("#min-value"),
  maxValue: document.querySelector("#max-value"),
  applyChoropleth: document.querySelector("#apply-choropleth"),
  clearChoropleth: document.querySelector("#clear-choropleth"),
  dataWarnings: document.querySelector("#data-warnings"),
  addText: document.querySelector("#add-text"),
  addPin: document.querySelector("#add-pin"),
  annotationColor: document.querySelector("#annotation-color"),
  annotationSize: document.querySelector("#annotation-size"),
  annotationBg: document.querySelector("#annotation-bg"),
  annotationList: document.querySelector("#annotation-list"),
  saveSnapshot: document.querySelector("#save-snapshot"),
  snapshotList: document.querySelector("#snapshot-list"),
  backgroundColor: document.querySelector("#background-color"),
  importJson: document.querySelector("#import-json"),
  exportJson: document.querySelector("#export-json"),
  exportSvg: document.querySelector("#export-svg"),
  exportSvgAlt: document.querySelector("#export-svg-2"),
  exportPng: document.querySelector("#export-png"),
  exportPngAlt: document.querySelector("#export-png-2"),
  exportJpg: document.querySelector("#export-jpg"),
  exportJpgAlt: document.querySelector("#export-jpg-2"),
  unlockTransparent: document.querySelector("#unlock-transparent"),
  exportTransparent: document.querySelector("#export-transparent"),
  projectionSelect: document.querySelector("#projection"),
  mapDetail: document.querySelector("#map-detail"),
  zoomIn: document.querySelector("#zoom-in"),
  zoomOut: document.querySelector("#zoom-out"),
  fitWorld: document.querySelector("#fit-world"),
  modeSelect: document.querySelector("#mode-select"),
  modeText: document.querySelector("#mode-text"),
  modePin: document.querySelector("#mode-pin"),
seaEnabled: document.querySelector("#sea-enabled"),
seaFill: document.querySelector("#sea-fill"),
seaOpacity: document.querySelector("#sea-opacity"),
disputesEnabled: document.querySelector("#disputes-enabled"),
disputesStyle: document.querySelector("#disputes-style"),
disputesLabels: document.querySelector("#disputes-labels"),
disputesList: document.querySelector("#disputes-list"),
disputedMatchSelected: document.querySelector("#disputed-match-selected"),
disputedFill: document.querySelector("#disputed-fill"),
disputesSelectAll: document.querySelector("#disputes-select-all"),
disputesSelectNone: document.querySelector("#disputes-select-none"),
selectedPattern: document.querySelector("#selected-pattern"),
patternColor: document.querySelector("#pattern-color"),
  pinIcon: document.querySelector("#pin-icon"),
  pinColor: document.querySelector("#pin-color"),
  pinSize: document.querySelector("#pin-size"),
  pinLabelTextColor: document.querySelector("#pin-label-text-color"),
  pinLabelBgColor: document.querySelector("#pin-label-bg-color"),

};

const defaultState = () => ({
  countries: new Map(),
  features: [],
  selection: new Set(),
  hidden: new Set(),
  styles: {
    selectedFill: "#2563eb",
	selectedPattern: "solid",
	patternColor: "#0f172a",
    nonSelectedFill: "#e2e8f0",
    nonSelectedOpacity: 0.7,
    noDataFill: "#cbd5f5",
	countryStroke: "#94a3b8",
	countryStrokeWidth: 0.5,
	countryBordersEnabled: true,
	coastStroke: "#94a3b8",
	coastStrokeWidth: 0.5,
	coastBordersEnabled: true,
    background: "#ffffff",
	seaEnabled: false,
	seaFill: "#93c5fd",   // only used when seaEnabled = true
	seaOpacity: 1,
	disputedMatchSelected: true,
	disputedFill: "#2563eb",
    pinIcon: "circle",          // "circle" or one of the svg keys you choose
    pinColor: "#1f2937",
    pinSize: 18,                // px (used for svg size, circle uses r = pinSize/4-ish)
    pinLabelTextColor: "#0f172a",
    pinLabelBgColor: "#ffffff",
  },
  annotations: [],
  legend: {
    title: "Legend",
    bins: [],
    position: { x: 40, y: 40 },
    visible: true,
    orientation: "vertical",
  },
  countryStyles: new Map(),
  countryPatterns: new Map(),
  choropleth: {
    active: false,
    data: new Map(),
    scaleMode: "quantile",
    buckets: 5,
    min: null,
    max: null,
    warnings: [],
    bins: [],
  },
  groups: [],
  pins: [],
  texts: [],
  projectionType: "mercator",
  mapDetail: "110m",
  zoomTransform: d3.zoomIdentity,
  mode: "select",
  snapshots: [],
  paidUnlock: false,
  disputes: {
    enabled: false,
    style: "tint",
    labels: false,
    features: [],
	groupList: [],
	enabledGroups: new Map(),
  },
});

const state = defaultState();

const STORAGE_KEY = "world-map-editor-state";
const UNLOCK_KEY = "world-map-editor-transparent-unlock";

let projection = d3.geoMercator();
let path = d3.geoPath(projection);
let countryLayer;
let pinLayer;
let textLayer;
let legendLayer;
let sphereLayer;
let disputeLayer;
let landLayer;
let lastMapSize = { width: 0, height: 0 };
let defsLayer;
const patternCache = new Map(); // key -> patternId
const zoomBehavior = d3
  .zoom()
  .scaleExtent([1, 8])
  .filter((event) => event.type !== "wheel")
  .on("zoom", (event) => {
  mapSvg.select(".map-root").attr("transform", event.transform);
  state.zoomTransform = event.transform;
});

let isRotatingGlobe = false;
let globeDragMoved = false;
let globeDragStart = null;
let globeRotateStart = null;

const globeDragBehavior = d3
  .drag()
  .on("start", (event) => {
    if (state.projectionType !== "geoOrthographic") return;

    isRotatingGlobe = true;
    globeDragMoved = false;
    globeDragStart = [event.x, event.y];
    globeRotateStart = projection.rotate(); // [lambda, phi, gamma]
  })
  .on("drag", (event) => {
    if (!isRotatingGlobe || state.projectionType !== "geoOrthographic") return;

    const dx = event.x - globeDragStart[0];
    const dy = event.y - globeDragStart[1];
    if (Math.abs(dx) + Math.abs(dy) > 2) globeDragMoved = true;

    // Sensitivity based on current scale (bigger globe = smaller degrees per pixel)
    const s = projection.scale();
    const k = 180 / (Math.PI * s);

    const lambda = globeRotateStart[0] + dx * k * 2.2;
    const phi = globeRotateStart[1] - dy * k * 2.2;

    projection.rotate([lambda, Math.max(-89, Math.min(89, phi)), globeRotateStart[2] || 0]);

countryLayer.selectAll("path.country").attr("d", path);
if (disputeLayer) {
  disputeLayer.selectAll("path.dispute-area").attr("d", path);
  disputeLayer.selectAll("text.dispute-label")
    .attr("transform", (d) => `translate(${path.centroid(d)})`);
}
if (landLayer) {
  landLayer.selectAll("path.land-outline").attr("d", path);
}
if (sphereLayer) {
  sphereLayer.selectAll("path.globe-outline").attr("d", path);
  sphereLayer.selectAll("path.sea-sphere").attr("d", path);
}

// Keep the SVG clipPath in sync with the current path()
mapSvg.selectAll("path.globe-clip-path").attr("d", path);

updateAnnotations();
renderLegend();

  })
  .on("end", () => {
    if (state.projectionType !== "geoOrthographic") return;

    isRotatingGlobe = false;
    globeDragStart = null;
    globeRotateStart = null;

    // Persist rotation by saving projectionType only is not enough.
    // If you want to persist rotation, we can store it in state too.
    scheduleSave();
  });
  
let presetGroups = [];

const loadPresetGroups = async () => {
  try {
    const res = await fetch("./data/preset-groups.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load preset-groups.json (${res.status})`);
    const data = await res.json();

    // basic sanity
    if (!Array.isArray(data)) throw new Error("preset-groups.json must be an array");
    presetGroups = data
      .filter((g) => g && typeof g.name === "string" && Array.isArray(g.iso3List))
      .map((g) => ({ name: g.name, iso3List: g.iso3List }));
  } catch (err) {
    console.warn("Preset groups not loaded, continuing without them:", err);
    presetGroups = [];
  }
};

const aliasMap = new Map([
  ["bolivia (plurinational state of)", "BOL"],
  ["bolivia", "BOL"],
  ["cote divoire", "CIV"],
  ["côte d'ivoire", "CIV"],
  ["congo, the democratic republic of the", "COD"],
  ["congo, democratic republic of the", "COD"],
  ["congo", "COG"],
  ["russian federation", "RUS"],
  ["viet nam", "VNM"],
  ["iran (islamic republic of)", "IRN"],
  ["lao people's democratic republic", "LAO"],
  ["korea, republic of", "KOR"],
  ["korea, democratic people's republic of", "PRK"],
  ["united states of america", "USA"],
  ["tanzania, united republic of", "TZA"],
  ["venezuela (bolivarian republic of)", "VEN"],
  ["syrian arab republic", "SYR"],
  ["moldova, republic of", "MDA"],
  ["bolivia (plurinational state)", "BOL"],
  ["micronesia, federated states of", "FSM"],
  ["brunei darussalam", "BRN"],
  ["swaziland", "SWZ"],
  ["cabo verde", "CPV"],
  ["bahamas", "BHS"],
  ["the bahamas", "BHS"],
  ["gambia", "GMB"],
  ["the gambia", "GMB"],
  ["cape verde", "CPV"],
  ["republic of the congo", "COG"],
  ["democratic republic of the congo", "COD"],
  ["myanmar", "MMR"],
  ["north korea", "PRK"],
  ["south korea", "KOR"],
  ["united kingdom", "GBR"],
  ["uk", "GBR"],
  ["falkland islands", "FLK"],
  ["falkland islands (islas malvinas)", "FLK"],
  ["svalbard and jan mayen", "SJM"],
  ["france", "FRA"],
  ["laos", "LAO"],
  ["syria", "SYR"],
  ["tanzania", "TZA"],
  ["iran", "IRN"],
  ["macao", "MAC"],
  ["macau", "MAC"],
  ["taiwan", "TWN"],
  ["bolivia (plurinational state of)", "BOL"],
  ["venezuela", "VEN"],
  ["north macedonia", "MKD"],
  ["czechia", "CZE"],
  ["cape verde", "CPV"],
  ["kyrgyzstan", "KGZ"],
]);

const colorRamp = (buckets) => {
  const ramp = d3.schemeBlues[Math.min(Math.max(buckets, 3), 9)];
  if (ramp && ramp.length === buckets) {
    return ramp;
  }
  const full = d3.schemeBlues[9];
  return full.slice(full.length - buckets);
};

const normalize = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const fetchJsonWithFallback = async (urls) => {
  const list = Array.isArray(urls) ? urls : [urls];
  for (const url of list) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      return await response.json();
    } catch (error) {
      console.warn("Failed to load", url, error);
    }
  }
  return null;
};
const buildIsoIndexes = (isoData) => {
  const isoByName = new Map();
  const isoByNumeric = new Map();

  const isoRows = Array.isArray(isoData)
    ? isoData
    : (isoData?.countries || isoData?.data || []);

  isoRows.forEach((row) => {
    const name =
      row.name ??
      row.country ??
      row.Country ??
      row.countryName ??
      row.country_name;

    const alpha3 =
      row["alpha-3"] ??
      row.alpha3 ??
      row.alpha_3 ??
      row.alpha ??
      row["Alpha-3"];

    const numeric =
      row["country-code"] ??
      row.numeric ??
      row.countryCode ??
      row.country_code ??
      row["country code"];

    if (!name || !alpha3) return;

    const a3 = String(alpha3).toUpperCase();
    isoByName.set(normalize(String(name)), a3);

    if (numeric != null && numeric !== "") {
      isoByNumeric.set(String(numeric).padStart(3, "0"), a3);
    }
  });

  return { isoByName, isoByNumeric };
};

const countCoords = (geom) => {
  if (!geom) return 0;
  if (geom.type === "MultiLineString") {
    return geom.coordinates.reduce((sum, line) => sum + line.length, 0);
  }
  if (geom.type === "LineString") return geom.coordinates.length;
  return 0;
};

const applyTopologyToState = (topology, isoByName, isoByNumeric) => {
  state._topologyRaw = topology;

  const geojson = feature(topology, topology.objects.countries);

  // Build a coastline mesh from the SAME arcs as the countries topology.
  // Filter out Antarctica the same way you filter it out of state.features (id "010").
  const countriesObj = topology.objects.countries;
  const filteredCountriesObj = {
    type: "GeometryCollection",
    geometries: (countriesObj.geometries || []).filter((g) => {
      const id3 = g.id == null ? "" : String(g.id).padStart(3, "0");
      return id3 !== "010";
    }),
  };
  state.coastMesh = mesh(topology, filteredCountriesObj, (a, b) => a === b);

  state.features = geojson.features
    .filter((feature) => feature.id !== "010" && feature.properties?.name !== "Antarctica")
    .map((feature) => {
      const name = feature.properties?.name || "Unknown";
      const normalized = normalize(name);

      const id3 = feature.id == null ? "" : String(feature.id).padStart(3, "0");

      const iso3 =
        aliasMap.get(normalized) ||
        isoByName.get(normalized) ||
        isoByNumeric.get(id3);

      const resolvedIso3 = iso3 || `UNK-${id3 || feature.id}`;

      // ✅ OPTION B: Drop Maldives at 10m detail to avoid the world-sized polygon issue
      if (state.mapDetail === "10m" && resolvedIso3 === "MDV") {
        return null;
      }

      return {
        ...feature,
        properties: {
          ...feature.properties,
          name,
          iso3: resolvedIso3,
        },
        __geoArea: d3.geoArea(feature), // steradians, used for sorting
      };
    })
    .filter(Boolean)
    // Biggest first (back). Smallest last (on top).
    .sort((a, b) => (b.__geoArea || 0) - (a.__geoArea || 0));

  // DEBUG: find suspiciously large features (world-sized polygons)
  const areas = state.features
    .map((f) => ({
      iso3: f.properties.iso3,
      name: f.properties.name,
      id: f.id,
      area: d3.geoArea(f),
    }))
    .sort((a, b) => b.area - a.area)
    .slice(0, 10);

  console.log("top 10 geo areas:", areas);

  // Rebuild countries lookup
  state.countries = new Map();
  state.features.forEach((feature) => {
    state.countries.set(feature.properties.iso3, {
      name: feature.properties.name,
      iso3: feature.properties.iso3,
    });
  });
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const hexToRgb = (hex) => {
  const h = String(hex || "").replace("#", "").trim();
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

const mix = (a, b, t) => a + (b - a) * t;

const tint = (hex, t) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: mix(r, 255, t), g: mix(g, 255, t), b: mix(b, 255, t) });
};

const shade = (hex, t) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: mix(r, 0, t), g: mix(g, 0, t), b: mix(b, 0, t) });
};

const patternKey = (type, fill, stroke) =>
  `${type}::${String(fill).toLowerCase()}::${String(stroke).toLowerCase()}`;

const ensureFillPattern = (type, fillHex) => {
  if (!defsLayer) return null;
  if (!type || type === "solid") return null;

  const stroke = state.styles.patternColor || "#0f172a";
const key = patternKey(type, fillHex, stroke);

  if (patternCache.has(key)) return patternCache.get(key);

  const id = `pat-${type}-${Math.random().toString(16).slice(2)}`;
  patternCache.set(key, id);

  // Background is the actual fill color; stroke is a darker shade of it.
  const bg = fillHex;

  const p = defsLayer
    .append("pattern")
    .attr("id", id)
    .attr("patternUnits", "userSpaceOnUse");

  // Default sizing, tweaked per pattern
  let size = 10;

  const addBg = () => {
    p.append("rect").attr("x", 0).attr("y", 0).attr("width", size).attr("height", size).attr("fill", bg);
  };

  const line = (x1, y1, x2, y2, w = 1) => {
    p.append("line")
      .attr("x1", x1).attr("y1", y1)
      .attr("x2", x2).attr("y2", y2)
      .attr("stroke", stroke)
      .attr("stroke-width", w);
  };

  const rect = (x, y, w, h, sw = 1) => {
    p.append("rect")
      .attr("x", x).attr("y", y)
      .attr("width", w).attr("height", h)
      .attr("fill", "none")
      .attr("stroke", stroke)
      .attr("stroke-width", sw);
  };

  const circle = (cx, cy, r) => {
    p.append("circle").attr("cx", cx).attr("cy", cy).attr("r", r).attr("fill", stroke);
  };

  if (type === "hatched") {
    size = 10;
    p.attr("width", size).attr("height", size);
    addBg();
    line(0, size, size, 0, 1);
  } else if (type === "crosshatch") {
    size = 10;
    p.attr("width", size).attr("height", size);
    addBg();
    line(0, size, size, 0, 1);
    line(0, 0, size, size, 1);
  } else if (type === "grid") {
    size = 10;
    p.attr("width", size).attr("height", size);
    addBg();
    line(0, 0, size, 0, 1);
    line(0, 0, 0, size, 1);
} else if (type === "checked") {
  size = 12;
  p.attr("width", size).attr("height", size);
  addBg();

  // chessboard: fill two alternating squares with pattern color
  p.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", size / 2)
    .attr("height", size / 2)
    .attr("fill", stroke);

  p.append("rect")
    .attr("x", size / 2)
    .attr("y", size / 2)
    .attr("width", size / 2)
    .attr("height", size / 2)
    .attr("fill", stroke);
  } else if (type === "diamondGrid") {
    size = 12;
    p.attr("width", size).attr("height", size);
    addBg();
    // diamonds: draw two diagonals across the tile edges
    line(size / 2, 0, size, size / 2, 1);
    line(size, size / 2, size / 2, size, 1);
    line(size / 2, size, 0, size / 2, 1);
    line(0, size / 2, size / 2, 0, 1);
  } else if (type === "dots") {
    size = 10;
    p.attr("width", size).attr("height", size);
    addBg();
    circle(size / 2, size / 2, 1.5);
  } else if (type === "sparseDots") {
    size = 16;
    p.attr("width", size).attr("height", size);
    addBg();
    circle(size / 2, size / 2, 1.7);
  } else if (type === "hStripes") {
    size = 10;
    p.attr("width", size).attr("height", size);
    addBg();
    line(0, size / 2, size, size / 2, 1.2);
  } else if (type === "vStripes") {
    size = 10;
    p.attr("width", size).attr("height", size);
    addBg();
    line(size / 2, 0, size / 2, size, 1.2);
  } else {
    // fallback
    p.attr("width", 10).attr("height", 10);
    addBg();
    line(0, 10, 10, 0, 1);
  }

  return id;
};

const loadTopologyForDetail = async (detail) => {
  const key = detail || "110m";
  const url = DATA_SOURCES.countries[key] || DATA_SOURCES.countries["110m"];

  const topology = await d3.json(url);

  console.log("topology keys", Object.keys(topology || {}));
  console.log("objects keys", Object.keys(topology?.objects || {}));
  console.log("countries obj type", topology?.objects?.countries?.type);
  console.log("arcs length", topology?.arcs?.length);

  return topology;
};

const reloadMapDetail = async () => {
  // Preserve these across a topology swap
  const prevSelection = new Set(state.selection);
  const prevHidden = new Set(state.hidden);
  const prevCountryStyles = new Map(state.countryStyles);
  const prevCountryPatterns = new Map(state.countryPatterns);
  const topology = await loadTopologyForDetail(state.mapDetail);

  // iso indexes are built once and stored (see bootstrap changes below)
  applyTopologyToState(topology, state._isoByName, state._isoByNumeric);

  // Restore and drop anything that no longer exists in the new dataset
  state.selection = new Set([...prevSelection].filter((iso3) => state.countries.has(iso3)));
  state.hidden = new Set([...prevHidden].filter((iso3) => state.countries.has(iso3)));

  state.countryStyles = new Map(
    [...prevCountryStyles.entries()].filter(([iso3]) => state.countries.has(iso3))
  );
state.countryPatterns = new Map(
  [...prevCountryPatterns.entries()].filter(([iso3]) => state.countries.has(iso3))
);

  // Full re-render, because paths change with new topology
  renderMap();
  updateMap();
  renderSelectionList();
  renderSelectedCountries();
  renderGroups();
};

const hashToUnit = (str) => {
  // Simple deterministic hash -> [0, 1)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // unsigned -> [0,1)
  return (h >>> 0) / 4294967296;
};

const setMode = (mode) => {
  state.mode = mode;
  [ui.modeSelect, ui.modeText, ui.modePin].forEach((button) =>
    button.classList.remove("primary")
  );
  if (mode === "select") ui.modeSelect.classList.add("primary");
  if (mode === "text") ui.modeText.classList.add("primary");
  if (mode === "pin") ui.modePin.classList.add("primary");
};

const setupProjection = (width, height) => {
  switch (state.projectionType) {
    case "robinson":
      projection = d3GeoProjection.geoRobinson();
      break;
    case "winkel":
      projection = d3GeoProjection.geoWinkel3();
      break;
    case "equalEarth":
      projection = d3.geoEqualEarth();
      break;
    case "equirectangular":
      projection = d3.geoEquirectangular();
      break;
    case "geoNaturalEarth1":
      projection = d3.geoNaturalEarth1();
      break;
    case "geoOrthographic":
      projection = d3.geoOrthographic().clipAngle(90);
      break;	  
    default:
      projection = d3.geoMercator();
      break;
  }
// Fit the projection to real land geometry.
// Mercator + Sphere produces an overly small scale because poles explode.
const featuresForFit =
  state.projectionType === "geoOrthographic"
    ? state.features
    : state.features.filter((f) => f.properties?.iso3 !== "ATA");

const fitTarget =
  state.projectionType === "geoOrthographic"
    ? { type: "Sphere" }
    : (featuresForFit && featuresForFit.length
        ? { type: "FeatureCollection", features: featuresForFit }
        : { type: "Sphere" });

// Use feature-based fitting for all projections (safe and looks right).
projection.fitSize([width, height], fitTarget);

if (state.projectionType !== "geoOrthographic") {
  projection.clipExtent([[0, 0], [width, height]]);
} else {
  projection.clipExtent(null);
}


path = d3.geoPath(projection);

};

const getMapDimensions = () => {
  const rect = mapWrap.getBoundingClientRect();

  // Read CSS var like "--map-pad: 24px"
  const raw = getComputedStyle(mapWrap).getPropertyValue("--map-pad").trim();

  // Handles "24px", "24", "" safely
  let pad = 0;
  if (raw) {
    const n = Number.parseFloat(raw);
    pad = Number.isFinite(n) ? n : 0;
  }

  const outerWidth = Math.max(1, Math.round(rect.width));
  const outerHeight = Math.max(1, Math.round(rect.height));

  const innerWidth = Math.max(1, Math.round(outerWidth - pad * 2));
  const innerHeight = Math.max(1, Math.round(outerHeight - pad * 2));

  return { outerWidth, outerHeight, innerWidth, innerHeight, pad };
};
// NEW: pin icon registry (id -> file path)
const PIN_ICON_FILES = {
  "location-pin": "./location-pin.svg",
  "location-pin-2": "./location-pin-2.svg",
  "location-target": "./location-target.svg",
  "map-pin": "./map-pin.svg",
  "map-pin-2": "./map-pin-2.svg",
  "map-pin-3": "./map-pin-3.svg",
};

// NEW: inline SVGs into <defs> as <symbol> so we can <use> them
const ensurePinSymbolsLoaded = async () => {
  if (!defsLayer) return;

  // Avoid double-loading
  if (defsLayer.select("#pin-symbols-loaded").node()) return;
  defsLayer.append("g").attr("id", "pin-symbols-loaded");

  const parser = new DOMParser();

  await Promise.all(
    Object.entries(PIN_ICON_FILES).map(async ([key, url]) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;

        const svgText = await res.text();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgEl = doc.querySelector("svg");
        if (!svgEl) return;

        const viewBox = svgEl.getAttribute("viewBox") || "0 0 24 24";

        // Use the SVG's inner markup as the symbol content
        const symbol = defsLayer
          .append("symbol")
          .attr("id", `pin-icon-${key}`)
          .attr("viewBox", viewBox);

        // Move all children into symbol
        Array.from(svgEl.childNodes).forEach((node) => {
          // Ignore <title>, <desc> etc if you want, but harmless
          symbol.node().appendChild(node.cloneNode(true));
        });

        // Strip hardcoded fill/stroke so it inherits via currentColor
        symbol.selectAll("[fill]").attr("fill", "currentColor");
        symbol.selectAll("[stroke]").attr("stroke", "currentColor");
        // Some SVGs use inline style="fill:..."
        symbol.selectAll("[style]").each(function () {
          const el = d3.select(this);
          const style = (el.attr("style") || "")
            .replace(/fill\s*:\s*[^;]+;?/gi, "fill:currentColor;")
            .replace(/stroke\s*:\s*[^;]+;?/gi, "stroke:currentColor;");
          el.attr("style", style);
        });
      } catch (e) {
        // swallow, icon just won't be available
      }
    })
  );
};


const renderMap = () => {
  // NEW: use the improved getMapDimensions() return shape
  // It should return: { outerWidth, outerHeight, innerWidth, innerHeight, pad }
  const { outerWidth, outerHeight, innerWidth, innerHeight, pad } = getMapDimensions();

  if (!outerWidth || !outerHeight) return;

  // Track the actual SVG box size (outer)
  lastMapSize = { width: outerWidth, height: outerHeight };

  // Fit projection to the drawable inner area only (after padding)
  setupProjection(innerWidth, innerHeight);

  // Let CSS control layout size (inset/100%); JS controls viewBox only.
  mapSvg
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", "100%");

  mapSvg.selectAll("g").remove();
  mapSvg.selectAll("defs").remove();

  const root = mapSvg
    .append("g")
    .attr("class", "map-root")
    .attr("transform", `translate(${pad},${pad})`);

  sphereLayer = root.append("g").attr("class", "sphere");

patternCache.clear();
defsLayer = mapSvg.append("defs");
ensurePinSymbolsLoaded();

// Create an SVG clipPath for orthographic so strokes can't draw outside the globe
if (state.projectionType === "geoOrthographic") {
  defsLayer
    .append("clipPath")
    .attr("id", "globe-clip")
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "globe-clip-path")
    .attr("d", path);
}

  countryLayer = root.append("g").attr("class", "countries"); // above
  disputeLayer = root.append("g").attr("class", "disputes");  // below
  landLayer = root.append("g").attr("class", "land"); // coastlines
  pinLayer = root.append("g").attr("class", "pins");
  textLayer = root.append("g").attr("class", "texts");
  legendLayer = root.append("g").attr("class", "legend");

  // Apply the clip to everything that should be constrained to the globe
  if (state.projectionType === "geoOrthographic") {
    disputeLayer.attr("clip-path", "url(#globe-clip)");
    landLayer.attr("clip-path", "url(#globe-clip)");
    countryLayer.attr("clip-path", "url(#globe-clip)");
    pinLayer.attr("clip-path", "url(#globe-clip)");
    textLayer.attr("clip-path", "url(#globe-clip)");
  }

  sphereLayer.selectAll("*").remove();

  // Sea background (2D)
  if (state.projectionType !== "geoOrthographic") {
    sphereLayer
      .append("rect")
      .attr("class", "sea-rect")
      .attr("x", 0)
      .attr("y", 0)
      // NEW: inner sizes only (no more width - pad*2 here)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", state.styles.seaEnabled ? state.styles.seaFill : "transparent")
      .attr("fill-opacity", state.styles.seaOpacity ?? 1)
      .attr("pointer-events", "none");
  }

  // Sea + outline (globe)
  if (state.projectionType === "geoOrthographic") {
    sphereLayer
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "sea-sphere")
      .attr("d", path)
      .attr("fill", state.styles.seaEnabled ? state.styles.seaFill : "transparent")
      .attr("fill-opacity", state.styles.seaOpacity ?? 1)
      .attr("pointer-events", "none");

    // Globe outline on top
    sphereLayer
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "globe-outline")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 1)
      .attr("opacity", 0.35)
      .attr("pointer-events", "none");
  }

  console.log("features:", state.features.length);

  const keys = state.features.map((d) => d.properties.iso3 || String(d.id) || d.properties.name);

  console.log("unique keys:", new Set(keys).size);

  // Show top duplicates
  const counts = new Map();
  keys.forEach((k) => counts.set(k, (counts.get(k) || 0) + 1));
  console.log(
    "duplicates:",
    [...counts.entries()].filter(([, c]) => c > 1).slice(0, 20)
  );

  if (landLayer && state.coastMesh) {
    landLayer
      .selectAll("path.land-outline")
      .data([state.coastMesh])
      .join("path")
      .attr("class", "land-outline")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", state.styles.coastStroke || "#94a3b8")
      .attr("stroke-width", state.styles.coastStrokeWidth ?? 0.5)
      .attr("pointer-events", "none");
  }

  countryLayer
    .selectAll("path")
    .data(state.features, (d) => d.properties.iso3 || String(d.id))
    .join("path")
    .attr("class", "country")
    .attr("data-iso3", (d) => d.properties.iso3)
    .attr("d", path)
    .style("pointer-events", (d) =>
      state.mapDetail === "10m" && d.properties.iso3 === "MDV" ? "none" : "fill"
    )
    .on("pointerover", handlePointerOver)
    .on("pointermove", handlePointerMove)
    .on("pointerout", handlePointerOut)
    .on("click", handleCountryClick);

  console.log("rendered country paths:", countryLayer.selectAll("path.country").size());

  mapSvg.on(".drag", null);

  if (state.projectionType === "geoOrthographic") {
    mapSvg.on(".zoom", null);
    mapSvg.call(globeDragBehavior);
  } else {
    mapSvg.call(zoomBehavior);
    mapSvg.call(zoomBehavior.transform, state.zoomTransform);
  }

  updateMap();
  updateAnnotations();
  renderLegend();
};


const updateMap = () => {
if (sphereLayer && state.projectionType === "geoOrthographic") {
  sphereLayer.selectAll("path.globe-outline").attr("d", path);
}
  const bordersOn = state.styles.countryBordersEnabled !== false;
  const coastOn = state.styles.coastBordersEnabled !== false;

  if (landLayer) {
    landLayer
      .selectAll("path.land-outline")
      .attr("stroke", coastOn ? (state.styles.coastStroke || "#94a3b8") : "none")
      .attr("stroke-width", coastOn ? (state.styles.coastStrokeWidth ?? 0.5) : 0)
      .attr("display", coastOn ? null : "none");
  }

  countryLayer
    .selectAll("path")
	.attr("display", (d) => {
	  const iso3 = d.properties.iso3;
	  const autoHideAntarctica = iso3 === "ATA" && state.projectionType !== "geoOrthographic";
	  return (state.hidden.has(iso3) || autoHideAntarctica) ? "none" : null;
	})
    .attr("fill", (d) => getCountryFill(d.properties.iso3))
    .attr("fill-opacity", (d) => getCountryOpacity(d.properties.iso3))
    .attr("stroke", bordersOn ? (state.styles.countryStroke || "#94a3b8") : "none")
    .attr("stroke-width", bordersOn ? (state.styles.countryStrokeWidth ?? 0.5) : 0);
  updateDisputes(); 
  updateSelectionSummary();
  updateLegendBinsUI();
  renderLegend();
};

const updateSea = () => {
  if (!sphereLayer) return;

  const fill = state.styles.seaEnabled ? state.styles.seaFill : "transparent";
  const opacity = state.styles.seaOpacity ?? 1;

  const isGlobe = state.projectionType === "geoOrthographic";

  // 2D sea rect only matters when not a globe projection
  if (!isGlobe) {
    sphereLayer
      .selectAll("rect.sea-rect")
      .attr("fill", fill)
      .attr("fill-opacity", opacity);
  }

  // Globe sea disk (inside rim)
  sphereLayer
    .selectAll("path.sea-sphere")
    .attr("fill", fill)
    .attr("fill-opacity", opacity);
};

const updateDisputes = () => {
  if (!disputeLayer) return;

  // If disputes are off or no data, clear the layer and leave
  if (!state.disputes?.enabled || !state.disputes.features?.length) {
    disputeLayer.selectAll("*").remove();
    return;
  }

  // Force tint only
  state.disputes.style = "tint";

  // Compute enabled features (group-based if available)
  const enabledFeatures =
    state.disputes.groupList?.length
      ? state.disputes.groupList
          .filter((g) => state.disputes.enabledGroups?.get(g.id) !== false)
          .flatMap((g) => g.features)
      : state.disputes.features;

  // ✅ log AFTER enabledFeatures exists
  console.log("disputes", {
    enabled: state.disputes?.enabled,
    enabledFeatures: enabledFeatures.length,
  });

  if (!enabledFeatures.length) {
    disputeLayer.selectAll("*").remove();
    return;
  }

  const disputedFill =
    state.styles?.disputedMatchSelected
      ? state.styles.selectedFill
      : (state.styles?.disputedFill || state.styles.selectedFill);

  // Draw polygons (tint only) and DO NOT block clicks
  disputeLayer
    .selectAll("path.dispute-area")
    .data(enabledFeatures, (d, i) => d?.properties?.name || d?.id || i)
    .join("path")
    .attr("class", "dispute-area tint")
    .attr("d", path)
    .attr("fill", disputedFill)
    .attr("fill-opacity", 1)
    .attr("stroke", "none")
    .attr("pointer-events", "none"); // ✅ critical

  // Labels (also must not block clicks)
  disputeLayer.selectAll("text.dispute-label").remove();
  if (state.disputes.labels) {
    disputeLayer
      .selectAll("text.dispute-label")
      .data(enabledFeatures)
      .join("text")
      .attr("class", "dispute-label")
      .attr("transform", (d) => `translate(${path.centroid(d)})`)
      .attr("text-anchor", "middle")
      .text((d) => d?.properties?.name || "Disputed area")
      .attr("pointer-events", "none"); // ✅
  }
};

const getCountryFill = (iso3) => {
  // Choropleth always wins and stays solid
  if (state.choropleth.active) {
    const value = state.choropleth.data.get(iso3);
    if (value === undefined || value === null || Number.isNaN(value)) {
      return state.styles.noDataFill;
    }
    return applyChoroplethColor(value);
  }

  // Selected countries: allow solid OR pattern
  if (state.selection.has(iso3)) {
    const fillHex = state.countryStyles.get(iso3) || state.styles.selectedFill;

    // Per-country pattern override if set, else fall back to global selectedPattern
    const pattern =
      state.countryPatterns.get(iso3) ||
      state.styles.selectedPattern ||
      "solid";

    // "solid" means just return the fill color
    const patId = ensureFillPattern(pattern, fillHex);
    return patId ? `url(#${patId})` : fillHex;
  }

  // Non-selected is solid
  return state.styles.nonSelectedFill;
};

const getCountryOpacity = (iso3) => {
  if (state.selection.has(iso3)) {
    return 1;
  }
  return state.styles.nonSelectedOpacity;
};

const handlePointerOver = (event, feature) => {
  const target = event.currentTarget;
  target.classList.add("hovered");
  showTooltip(feature.properties.name || "Unknown", event);
};

const handlePointerMove = (event, feature) => {
  showTooltip(feature.properties.name || "Unknown", event);
};

const handlePointerOut = (event) => {
  event.currentTarget.classList.remove("hovered");
  hideTooltip();
};

const handleCountryClick = (event, feature) => {
	if (state.projectionType === "geoOrthographic" && globeDragMoved) {
	  globeDragMoved = false;
	  return;
	}
  if (state.mode === "text") {
    addTextAtEvent(event);
    return;
  }

  if (state.mode === "pin") {
    addPinFromFeature(feature);
    return;
  }

  const iso3 = feature.properties.iso3;

  // Multi-select by default: clicking toggles selection state.
  if (state.selection.has(iso3)) {
    state.selection.delete(iso3);
  } else {
    state.selection.add(iso3);
  }

  updateMap();
  renderSelectionList();
  renderSelectedCountries();
  scheduleSave();

  if (event.pointerType === "touch") {
    showTooltip(feature.properties.name || "Unknown", event);
    setTimeout(hideTooltip, 1600);
  }
};

const showTooltip = (text, event) => {
  tooltip.textContent = text;
  tooltip.style.display = "block";

  const { clientX, clientY } = event;

  // Position tooltip relative to the map-wrap (not the viewport)
  const wrapRect = mapWrap.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();

  let x = clientX - wrapRect.left + 12;
  let y = clientY - wrapRect.top + 12;

  // Clamp inside the map-wrap
  const maxX = wrapRect.width - tipRect.width - 12;
  const maxY = wrapRect.height - tipRect.height - 12;

  if (x > maxX) x = clientX - wrapRect.left - tipRect.width - 12;
  if (y > maxY) y = clientY - wrapRect.top - tipRect.height - 12;

  // Final safety clamp
  x = Math.max(12, Math.min(x, maxX));
  y = Math.max(12, Math.min(y, maxY));

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
};

const hideTooltip = () => {
  tooltip.style.display = "none";
};

const updateSelectionSummary = () => {
  if (state.selection.size === 0) {
    ui.selectionSummary.textContent = "Selected: none";
    return;
  }
  const names = [...state.selection]
    .map((iso3) => state.countries.get(iso3)?.name || iso3)
    .slice(0, 4);
  const rest = state.selection.size - names.length;
  ui.selectionSummary.textContent = `Selected: ${names.join(", ")}${rest > 0 ? ` +${rest}` : ""}`;
};

const renderSelectedCountries = () => {
  if (!ui.selectedCountryList) return;

  ui.selectedCountryList.innerHTML = "";

  if (state.selection.size === 0) {
    ui.selectedCountryList.innerHTML = `<div class="warnings">No countries selected yet.</div>`;
    return;
  }

  const selected = [...state.selection]
    .map((iso3) => ({
      iso3,
      name: state.countries.get(iso3)?.name || iso3,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  selected.forEach(({ iso3, name }) => {
    const row = document.createElement("div");
    row.className = "selected-country-row";

    const label = document.createElement("div");
    label.className = "selected-country-name";
    label.textContent = name;

    const swatchWrap = document.createElement("div");
    swatchWrap.className = "country-swatch";

    const input = document.createElement("input");
    input.type = "color";
    input.value = state.countryStyles.get(iso3) || state.styles.selectedFill;
    input.title = `Override fill for ${name}`;

    input.addEventListener("input", (event) => {
      state.countryStyles.set(iso3, event.target.value);
      updateMap();
      scheduleSave();
    });

    const clearBtn = document.createElement("button");
    clearBtn.className = "ghost";
    clearBtn.type = "button";
    clearBtn.textContent = "Reset";
    clearBtn.title = "Remove override for this country";
    clearBtn.addEventListener("click", () => {
      state.countryStyles.delete(iso3);
	  state.countryPatterns.delete(iso3);
      renderSelectedCountries();
      updateMap();
      scheduleSave();
    });

    swatchWrap.append(input, clearBtn);
    row.append(label, swatchWrap);
    ui.selectedCountryList.appendChild(row);
  });
};

const updateSearchResults = (query = "") => {
  const normalized = normalize(query);
  ui.countrySearch.dataset.iso3 = "";
  const list = state.features
    .map((feature) => ({
      name: feature.properties.name,
      iso3: feature.properties.iso3,
    }))
    .filter((entry) => {
      if (!normalized) return true;
      return (
        normalize(entry.name).includes(normalized) ||
        normalize(entry.iso3).includes(normalized)
      );
    })
    .slice(0, 20);

  ui.countryResults.innerHTML = "";
  list.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = `${entry.name} (${entry.iso3})`;
item.addEventListener("click", () => {
  // ✅ Auto-select on click
  state.selection.add(entry.iso3);

  updateMap();
  renderSelectionList();
  renderSelectedCountries();
  scheduleSave();

  // ✅ Clear input so user can immediately type again
  ui.countrySearch.value = "";
  ui.countrySearch.dataset.iso3 = "";

  // Close dropdown
  ui.countryResults.classList.remove("open");

  // Re-focus input (nice UX)
  ui.countrySearch.focus();

  // Optional: clear results so it doesn't flash open on empty string
  ui.countryResults.innerHTML = "";
});

    ui.countryResults.appendChild(item);
  });

  ui.countryResults.classList.toggle("open", list.length > 0);
};

const selectFromSearch = () => {
  const iso3 = ui.countrySearch.dataset.iso3;
  if (!iso3) return;
  state.selection.add(iso3);
  updateMap();
  renderSelectionList();
  renderSelectedCountries();
  scheduleSave();
};

const hideFromSearch = () => {
  const iso3 = ui.countrySearch.dataset.iso3;
  if (!iso3) return;
  state.hidden.add(iso3);
  updateMap();
  scheduleSave();
};

const applySelectedFill = () => {
  const color = ui.selectedFill.value;
  state.styles.selectedFill = color;
  state.selection.forEach((iso3) => {
    state.countryStyles.set(iso3, color);
  });
  updateMap();
  renderSelectionList();
  scheduleSave();
};
ui.countryStroke.addEventListener("input", () => {
  state.styles.countryStroke = ui.countryStroke.value;
  updateMap();
  scheduleSave();
});

if (ui.countryStrokeWidth) {
  ui.countryStrokeWidth.addEventListener("input", () => {
    state.styles.countryStrokeWidth = parseFloat(ui.countryStrokeWidth.value);
    updateMap();
    scheduleSave();
  });
}

if (ui.countryBordersEnabled) {
  ui.countryBordersEnabled.addEventListener("change", () => {
    state.styles.countryBordersEnabled = ui.countryBordersEnabled.checked;
    updateMap();
    scheduleSave();
  });
}

if (ui.coastStroke) {
  ui.coastStroke.addEventListener("input", () => {
    state.styles.coastStroke = ui.coastStroke.value;
    updateMap();
    scheduleSave();
  });
}

if (ui.coastStrokeWidth) {
  ui.coastStrokeWidth.addEventListener("input", () => {
    state.styles.coastStrokeWidth = parseFloat(ui.coastStrokeWidth.value);
    updateMap();
    scheduleSave();
  });
}

if (ui.coastBordersEnabled) {
  ui.coastBordersEnabled.addEventListener("change", () => {
    state.styles.coastBordersEnabled = ui.coastBordersEnabled.checked;
    updateMap();
    scheduleSave();
  });
}

const renderSelectionList = () => {
  ui.annotationList.innerHTML = "";
  state.texts.forEach((text) => {
    const card = document.createElement("div");
    card.className = "annotation-card";
    card.innerHTML = `<strong>Text</strong><span>${text.text}</span>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.className = "ghost";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editText(text.id));
    const remove = document.createElement("button");
    remove.className = "ghost";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removeText(text.id));
    actions.append(edit, remove);
    card.append(actions);
    ui.annotationList.appendChild(card);
  });

  state.pins.forEach((pin) => {
    const card = document.createElement("div");
    card.className = "annotation-card";
    card.innerHTML = `<strong>Pin</strong><span>${pin.label || pin.iso3 || ""}</span>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.className = "ghost";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editPin(pin.id));
    const remove = document.createElement("button");
    remove.className = "ghost";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removePin(pin.id));
    actions.append(edit, remove);
    card.append(actions);
    ui.annotationList.appendChild(card);
  });
};

const resetColors = () => {
  state.countryStyles.clear();
  state.countryPatterns.clear();
  state.styles.selectedFill = "#2563eb";
  state.styles.selectedPattern = "solid";
  state.styles.nonSelectedFill = "#e2e8f0";
  state.styles.nonSelectedOpacity = 0.7;
  state.styles.noDataFill = "#cbd5f5";
  updateControls();
  updateMap();
  scheduleSave();
};

const resetAll = () => {
  // Preserve whatever projection the user is currently looking at
  const currentProjectionType = state.projectionType;

  // Also preserve loaded geography data so the map never “disappears”
  const existingFeatures = state.features;
  const existingCountries = state.countries;

  // Preserve disputes data loaded at bootstrap (so the UI doesn’t break)
  const existingDisputeFeatures = state.disputes?.features || [];
  const existingDisputeGroupList = state.disputes?.groupList || [];
  const existingEnabledGroups = state.disputes?.enabledGroups || new Map();

  // Build a fresh default state
  const fresh = defaultState();

  // Apply defaults into current state object
  Object.assign(state, fresh);

  // Restore preserved items
  state.projectionType = currentProjectionType;
  state.features = existingFeatures;
  state.countries = existingCountries;

  state.disputes.features = existingDisputeFeatures;
  state.disputes.groupList = existingDisputeGroupList;
  state.disputes.enabledGroups = existingEnabledGroups;

  // Reset groups back to presets (as before)
  state.groups = presetGroups.map((group) => ({ ...group, id: crypto.randomUUID() }));

  // Clear selection/hidden explicitly (defaultState already does this, but keep it unambiguous)
  state.selection.clear();
  state.hidden.clear();
  state.countryStyles.clear();

  // If choropleth was active, defaults already cleared it, but make sure the UI clears too
  state.choropleth.active = false;
  state.choropleth.data.clear();
  if (ui.dataWarnings) ui.dataWarnings.innerHTML = "";

  // Re-render everything, keeping the current projection
  updateControls();
  renderGroups();
  renderSnapshots();
  renderSelectionList();
  renderSelectedCountries();
  renderLegendEditor();

  renderMap();     // uses state.projectionType (preserved)
  updateMap();     // applies fills/strokes/etc.

  mapSvg.style("background", state.styles.background);
  scheduleSave();
};

const getDisputeId = (f, index) => {
  // Natural Earth often has a name-ish property, but be defensive.
  const p = f?.properties || {};
  const label =
    p.name || p.NAME || p.geonunit || p.GEONUNIT || p.note || p.NOTE || `Dispute ${index + 1}`;

  // ID should be stable and unique-ish
  const raw = `${label}|${p.scalerank ?? ""}|${p.featurecla ?? ""}|${index}`;
  return normalize(raw).replace(/\s+/g, "-");
};

const getDisputeLabel = (f, index) => {
  const p = f?.properties || {};
  return (
    p.name || p.NAME || p.geonunit || p.GEONUNIT || p.note || p.NOTE || `Dispute ${index + 1}`
  );
};

const renderDisputesListUI = () => {
  if (!ui.disputesList) return;

  const disabled = !state.disputes.enabled;
  ui.disputesList.innerHTML = "";

  state.disputes.groupList.forEach((group) => {
    const row = document.createElement("label");
    row.className = "dispute-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = state.disputes.enabledGroups.get(group.id) !== false;
    cb.disabled = disabled;

    cb.addEventListener("change", () => {
      state.disputes.enabledGroups.set(group.id, cb.checked);
      updateMap();
      scheduleSave();
    });

    const text = document.createElement("span");
    text.textContent = `${group.label} (${group.features.length})`;

    row.append(cb, text);
    ui.disputesList.appendChild(row);
  });
};

const renderGroups = () => {
  ui.groupList.innerHTML = "";
  state.groups.forEach((group) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `<strong>${group.name}</strong><span>${group.iso3List.length} countries</span>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const select = document.createElement("button");
    select.className = "ghost";
    select.textContent = "Select";
    select.addEventListener("click", () => selectGroup(group));
    const color = document.createElement("button");
    color.className = "ghost";
    color.textContent = "Color";
    color.addEventListener("click", () => colorGroup(group));
	const hide = document.createElement("button");
	hide.className = "ghost";
	hide.textContent = isGroupIsolated(group) ? "Unhide" : "Hide";
	hide.addEventListener("click", () => toggleHideGroup(group));
	actions.append(select, color, hide);
    card.append(actions);
    ui.groupList.appendChild(card);
  });
};

const selectGroup = (group) => {
  state.selection = new Set(group.iso3List.filter((iso3) => state.countries.has(iso3)));
  updateMap();
  renderSelectionList();
  scheduleSave();
};

const colorGroup = (group) => {
  const color = ui.selectedFill.value;
  group.iso3List.forEach((iso3) => {
    if (state.countries.has(iso3)) {
      state.countryStyles.set(iso3, color);
    }
  });
  updateMap();
  scheduleSave();
};

const hideGroup = (group) => {
  // Hide everything except the group's countries (that exist in the map).
  state.hidden.clear();

  const groupSet = new Set(group.iso3List.filter((iso3) => state.countries.has(iso3)));

  state.features.forEach((feature) => {
    const iso3 = feature.properties.iso3;
    if (!groupSet.has(iso3)) {
      state.hidden.add(iso3);
    }
  });

  updateMap();
  scheduleSave();
};

const addGroup = () => {
  if (state.selection.size === 0) return;
  const name = window.prompt("Group name?");
  if (!name) return;
  state.groups.unshift({
    id: crypto.randomUUID(),
    name,
    iso3List: [...state.selection],
  });
  renderGroups();
  scheduleSave();
};

const isGroupIsolated = (group) => {
  const groupSet = new Set(group.iso3List.filter((iso3) => state.countries.has(iso3)));

  // If at least one visible map feature that is NOT in the group is hidden,
  // and all non-group features are hidden, treat as isolated.
  let sawNonGroup = false;
  for (const feature of state.features) {
    const iso3 = feature.properties.iso3;
    if (!groupSet.has(iso3)) {
      sawNonGroup = true;
      if (!state.hidden.has(iso3)) return false; // a non-group country is still visible
    }
  }
  return sawNonGroup; // isolated only if there were non-group features to hide
};

const toggleHideGroup = (group) => {
  if (isGroupIsolated(group)) {
    // Unhide everything
    state.hidden.clear();
  } else {
    // Isolate group: hide everything except group countries
    state.hidden.clear();

    const groupSet = new Set(group.iso3List.filter((iso3) => state.countries.has(iso3)));
    for (const feature of state.features) {
      const iso3 = feature.properties.iso3;
      if (!groupSet.has(iso3)) {
        state.hidden.add(iso3);
      }
    }
  }

  updateMap();
  renderGroups(); // refresh button labels (Hide/Unhide)
  scheduleSave();
};

const hideSelected = () => {
  state.selection.forEach((iso3) => state.hidden.add(iso3));
  updateMap();
  scheduleSave();
};

const isolateSelected = () => {
  state.hidden.clear();
  state.features.forEach((feature) => {
    const iso3 = feature.properties.iso3;
    if (!state.selection.has(iso3)) {
      state.hidden.add(iso3);
    }
  });
  updateMap();
  scheduleSave();
};

const hideNoData = () => {
  state.features.forEach((feature) => {
    const iso3 = feature.properties.iso3;
    if (!state.choropleth.data.has(iso3)) {
      state.hidden.add(iso3);
    }
  });
  updateMap();
  scheduleSave();
};

const unhideAll = () => {
  state.hidden.clear();
  updateMap();
  scheduleSave();
};

const parseCsv = async (file) => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
    });
  });
};

const applyChoropleth = (rows) => {
  const warnings = [];
  const data = new Map();
  rows.forEach((row, index) => {
    const iso3 = row.iso3 || row.ISO3 || row.iso || row.ISO;
    const value = Number(row.value ?? row.Value ?? row.VAL ?? row.val);
    if (!iso3) {
      warnings.push(`Row ${index + 1}: Missing ISO3`);
      return;
    }
    if (!state.countries.has(iso3.toUpperCase())) {
      warnings.push(`Row ${index + 1}: Unknown ISO3 ${iso3}`);
      return;
    }
    if (Number.isNaN(value)) {
      warnings.push(`Row ${index + 1}: Invalid value for ${iso3}`);
      return;
    }
    data.set(iso3.toUpperCase(), value);
  });
  state.choropleth.data = data;
  state.choropleth.warnings = warnings;
  state.choropleth.active = true;
  state.choropleth.scaleMode = ui.scaleMode.value;
  state.choropleth.buckets = Number(ui.bucketCount.value) || 5;
  state.choropleth.min = ui.minValue.value ? Number(ui.minValue.value) : null;
  state.choropleth.max = ui.maxValue.value ? Number(ui.maxValue.value) : null;

  updateLegendBins();
  updateMap();
  renderLegendEditor();
  renderGroups();
  scheduleSave();
};

const applyChoroplethColor = (value) => {
  const { scale, colors } = buildChoroplethScale();
  const index = scale(value);
  return colors[index] || colors[colors.length - 1];
};

const buildChoroplethScale = () => {
  const values = [...state.choropleth.data.values()];
  const buckets = state.choropleth.buckets;
  const colors = colorRamp(buckets);
  let min = state.choropleth.min ?? d3.min(values);
  let max = state.choropleth.max ?? d3.max(values);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }

  let scale;
  if (state.choropleth.scaleMode === "quantile") {
    scale = d3
      .scaleQuantile()
      .domain(values.length ? values : [min, max])
      .range(d3.range(colors.length));
  } else if (state.choropleth.scaleMode === "log") {
    scale = d3
      .scaleLog()
      .domain([Math.max(0.0001, min), max])
      .range([0, colors.length - 1]);
  } else {
    scale = d3.scaleLinear().domain([min, max]).range([0, colors.length - 1]);
  }
  return { scale, colors, min, max };
};

const updateLegendBins = () => {
  const { colors } = buildChoroplethScale();
  const values = [...state.choropleth.data.values()].sort((a, b) => a - b);
  const buckets = state.choropleth.buckets;
  if (!values.length) {
    state.legend.bins = colors.map((color, index) => ({
      label: `Bin ${index + 1}`,
      color,
      from: null,
      to: null,
    }));
    return;
  }

  const binSize = Math.max(1, Math.floor(values.length / buckets));
  state.legend.bins = colors.map((color, index) => {
    const from = values[index * binSize] ?? values[0];
    const to =
      values[Math.min(values.length - 1, (index + 1) * binSize - 1)] ??
      values[values.length - 1];
    return {
      label: `${from ?? 0} – ${to ?? 0}`,
      color,
      from,
      to,
    };
  });
};

const renderLegend = () => {
  legendLayer.selectAll("*").remove();
  if (!state.choropleth.active || !state.legend.visible) return;

  const legendGroup = legendLayer
    .append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${state.legend.position.x}, ${state.legend.position.y})`)
    .call(
      d3.drag().on("drag", (event) => {
        state.legend.position.x += event.dx;
        state.legend.position.y += event.dy;
        renderLegend();
        scheduleSave();
      })
    );

  legendGroup
    .append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", 0)
    .text(state.legend.title)
    .attr("font-size", 12)
    .attr("font-weight", 600);

  const itemGroup = legendGroup.append("g").attr("transform", "translate(0, 12)");
  const size = 16;
  state.legend.bins.forEach((bin, index) => {
    const y = state.legend.orientation === "horizontal" ? 0 : index * (size + 6);
    const x = state.legend.orientation === "horizontal" ? index * 90 : 0;
    const g = itemGroup.append("g").attr("transform", `translate(${x}, ${y})`);
    g.append("rect").attr("width", size).attr("height", size).attr("fill", bin.color).attr("stroke", "#0f172a");
    g.append("text").attr("x", size + 6).attr("y", size - 4).text(bin.label).attr("font-size", 11);
  });
};

const renderLegendEditor = () => {
  const existing = document.querySelector("#legend-editor");
  if (existing) existing.remove();

  const panel = document.createElement("section");
  panel.id = "legend-editor";
  panel.className = "panel";
  panel.innerHTML = `
    <h2>Legend editor</h2>
    <div class="field">
      <label for="legend-title">Title</label>
      <input id="legend-title" type="text" value="${state.legend.title}" />
    </div>
    <div class="field">
      <label for="legend-orientation">Orientation</label>
      <select id="legend-orientation">
        <option value="vertical">Vertical</option>
        <option value="horizontal">Horizontal</option>
      </select>
    </div>
    <div class="field">
      <label>
        <input id="legend-visible" type="checkbox" ${state.legend.visible ? "checked" : ""} />
        Show legend
      </label>
    </div>
    <div id="legend-bins" class="annotation-list"></div>
  `;

  const sidebar = document.querySelector(".sidebar");
  sidebar.insertBefore(panel, ui.addText.closest("section"));

  const titleInput = panel.querySelector("#legend-title");
  const orientationSelect = panel.querySelector("#legend-orientation");
  const visibleToggle = panel.querySelector("#legend-visible");
  const binsList = panel.querySelector("#legend-bins");

  orientationSelect.value = state.legend.orientation;

  titleInput.addEventListener("input", (event) => {
    state.legend.title = event.target.value;
    renderLegend();
    scheduleSave();
  });

  orientationSelect.addEventListener("change", (event) => {
    state.legend.orientation = event.target.value;
    renderLegend();
    scheduleSave();
  });

  visibleToggle.addEventListener("change", (event) => {
    state.legend.visible = event.target.checked;
    renderLegend();
    scheduleSave();
  });

  binsList.innerHTML = "";
  state.legend.bins.forEach((bin, index) => {
    const card = document.createElement("div");
    card.className = "annotation-card";
    card.innerHTML = `
      <strong>Bin ${index + 1}</strong>
      <input type="text" value="${bin.label}" />
    `;
    const input = card.querySelector("input");
    input.addEventListener("input", (event) => {
      bin.label = event.target.value;
      renderLegend();
      scheduleSave();
    });
    binsList.appendChild(card);
  });
};

const updateLegendBinsUI = () => {
  const editor = document.querySelector("#legend-editor");
  if (editor) {
    renderLegendEditor();
  }
};

const addPinFromFeature = (feature) => {
  const centroid = d3.geoCentroid(feature);

  state.pins.push({
    id: crypto.randomUUID(),
    iso3: feature.properties.iso3,
    lat: centroid[1],
    lng: centroid[0],

    // NEW: pin styles stored per pin
    icon: state.styles.pinIcon || "circle",
    color: state.styles.pinColor || "#1f2937",
    size: Number(state.styles.pinSize || 18),

    // NEW: label styles stored per pin
    label: feature.properties.name,
    labelTextColor: state.styles.pinLabelTextColor || "#0f172a",
    labelBgColor: state.styles.pinLabelBgColor || "#ffffff",
  });

  updateAnnotations();
  renderSelectionList();
  scheduleSave();
};

const updateAnnotations = () => {
  // NEW: render pins as <g> so we can support circle OR SVG + label bg
  const pins = pinLayer
    .selectAll("g.pin")
    .data(state.pins, (d) => d.id)
    .join((enter) => {
      const g = enter
        .append("g")
        .attr("class", "pin")
        .call(
          d3.drag().on("drag", (event, d) => {
            const coords = projection.invert([event.x, event.y]);
            if (coords) {
              d.lng = coords[0];
              d.lat = coords[1];
            }
            updateAnnotations();
          })
        );

      // icon holder
      g.append("g").attr("class", "pin-icon");

      // label group (rect + text)
      const label = g.append("g").attr("class", "pin-label");
      label.append("rect").attr("class", "pin-label-bg");
      label.append("text").attr("class", "pin-label-text");

      return g;
    });

  pins.each(function (d) {
    const g = d3.select(this);
    const [x, y] = projection([d.lng, d.lat]);

    g.attr("transform", `translate(${x}, ${y})`);

    // ---- icon ----
    const iconWrap = g.select("g.pin-icon");
    iconWrap.selectAll("*").remove();

    const size = Number(d.size || 18);
    const iconColor = d.color || "#1f2937";

    if ((d.icon || "circle") === "circle") {
      iconWrap
        .append("circle")
        .attr("r", Math.max(3, size / 4))
        .attr("fill", iconColor)
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 1);
    } else {
      // SVG symbol <use> (inherits currentColor via style="color")
      iconWrap
        .append("use")
        .attr("href", `#pin-icon-${d.icon}`)
        .attr("x", -size / 2)
        .attr("y", -size) // tip-ish alignment
        .attr("width", size)
        .attr("height", size)
        .style("color", iconColor);
    }

    // ---- label ----
    const labelText = d.label || "";
    const labelGroup = g.select("g.pin-label");

    if (!labelText) {
      labelGroup.style("display", "none");
      return;
    }

    labelGroup.style("display", null);

    const textEl = labelGroup
      .select("text.pin-label-text")
      .text(labelText)
      .attr("x", 10) // to the right of the pin
      .attr("y", 4)  // baseline tweak
      .attr("font-size", 12)
      .attr("fill", d.labelTextColor || "#0f172a");

    const bbox = textEl.node().getBBox();

    labelGroup
      .select("rect.pin-label-bg")
      .attr("x", bbox.x - 4)
      .attr("y", bbox.y - 2)
      .attr("width", bbox.width + 8)
      .attr("height", bbox.height + 4)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", d.labelBgColor || "#ffffff")
      .attr("stroke", "rgba(15, 23, 42, 0.25)")
      .attr("stroke-width", 0.75);
  });

  const texts = textLayer.selectAll("g.text-annotation").data(state.texts, (d) => d.id);
  const enter = texts
    .enter()
    .append("g")
    .attr("class", "text-annotation")
    .call(
      d3.drag().on("drag", (event, d) => {
        d.x = event.x;
        d.y = event.y;
        updateAnnotations();
      })
    )
    .on("dblclick", (event, d) => {
      event.stopPropagation();
      openTextEditor(d);
    });

  enter.append("rect").attr("class", "text-bg");
  enter.append("text").attr("class", "text-label");

  texts
    .merge(enter)
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
    .each(function (d) {
      const group = d3.select(this);
      const text = group.select("text.text-label");
      text
        .text(d.text)
        .attr("font-size", d.fontSize)
        .attr("fill", d.color)
        .attr("y", d.fontSize)
        .attr("x", 0);

      const bbox = text.node().getBBox();
      group
        .select("rect.text-bg")
        .attr("x", bbox.x - 4)
        .attr("y", bbox.y - 2)
        .attr("width", bbox.width + 8)
        .attr("height", bbox.height + 4)
        .attr("fill", d.backgroundColor || "transparent");
    });

  texts.exit().remove();
};

const addTextAtEvent = (event) => {
  const [x, y] = d3.pointer(event, mapSvg.node());
  const text = {
    id: crypto.randomUUID(),
    x,
    y,
    text: "New label",
    fontSize: Number(ui.annotationSize.value),
    color: ui.annotationColor.value,
    backgroundColor: ui.annotationBg.value,
  };
  state.texts.push(text);
  updateAnnotations();
  renderSelectionList();
  openTextEditor(text);
  scheduleSave();
};

const editText = (id) => {
  const text = state.texts.find((item) => item.id === id);
  if (!text) return;
  openTextEditor(text);
};

const openTextEditor = (text) => {
  textEditor.style.display = "block";
  textEditor.value = text.text;
  textEditor.style.left = `${text.x}px`;
  textEditor.style.top = `${text.y}px`;
  textEditor.focus();

  const commit = () => {
    text.text = textEditor.value || "Label";
    text.fontSize = Number(ui.annotationSize.value);
    text.color = ui.annotationColor.value;
    text.backgroundColor = ui.annotationBg.value;
    textEditor.style.display = "none";
    updateAnnotations();
    renderSelectionList();
    scheduleSave();
  };

  textEditor.onkeydown = (event) => {
    if (event.key === "Enter") {
      commit();
    }
  };
  textEditor.onblur = commit;
};

const removeText = (id) => {
  state.texts = state.texts.filter((item) => item.id !== id);
  updateAnnotations();
  renderSelectionList();
  scheduleSave();
};

const editPin = (id) => {
  const pin = state.pins.find((item) => item.id === id);
  if (!pin) return;
  const label = window.prompt("Pin label", pin.label || "");
  if (label !== null) {
    pin.label = label;
  }
  const color = window.prompt("Pin color (hex)", pin.color || "#1f2937");
  if (color) {
    pin.color = color;
  }
  updateAnnotations();
  scheduleSave();
};

const removePin = (id) => {
  state.pins = state.pins.filter((item) => item.id !== id);
  updateAnnotations();
  renderSelectionList();
  scheduleSave();
};

const saveSnapshot = () => {
  const name = window.prompt("Snapshot name?");
  if (!name) return;
  state.snapshots.push({ id: crypto.randomUUID(), name, data: serializeState() });
  renderSnapshots();
  scheduleSave();
};

const renderSnapshots = () => {
  ui.snapshotList.innerHTML = "";
  state.snapshots.forEach((snapshot) => {
    const card = document.createElement("div");
    card.className = "snapshot-card";
    card.innerHTML = `<strong>${snapshot.name}</strong>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const load = document.createElement("button");
    load.className = "ghost";
    load.textContent = "Load";
    load.addEventListener("click", () => loadSnapshot(snapshot));
    const duplicate = document.createElement("button");
    duplicate.className = "ghost";
    duplicate.textContent = "Duplicate";
    duplicate.addEventListener("click", () => duplicateSnapshot(snapshot));
    actions.append(load, duplicate);
    card.append(actions);
    ui.snapshotList.appendChild(card);
  });
};

const loadSnapshot = (snapshot) => {
  hydrateState(snapshot.data);
  renderMap();
  renderGroups();
  renderSelectionList();
  renderSnapshots();
  renderLegendEditor();
};

const duplicateSnapshot = (snapshot) => {
  state.snapshots.push({
    id: crypto.randomUUID(),
    name: `${snapshot.name} copy`,
    data: snapshot.data,
  });
  renderSnapshots();
  scheduleSave();
};

const serializeState = () => {
  return {
    selection: [...state.selection],
    hidden: [...state.hidden],
    styles: state.styles,
    countryStyles: Array.from(state.countryStyles.entries()),
	countryPatterns: Array.from(state.countryPatterns.entries()),
    choropleth: {
      active: state.choropleth.active,
      data: Array.from(state.choropleth.data.entries()),
      scaleMode: state.choropleth.scaleMode,
      buckets: state.choropleth.buckets,
      min: state.choropleth.min,
      max: state.choropleth.max,
      warnings: state.choropleth.warnings,
    },
	disputes: {
  enabled: state.disputes.enabled,
  style: state.disputes.style,
  labels: state.disputes.labels,
  enabledGroups: Array.from(state.disputes.enabledGroups.entries()),
},
    groups: state.groups,
    pins: state.pins,
    texts: state.texts,
    legend: state.legend,
    projectionType: state.projectionType,
    zoomTransform: { k: state.zoomTransform.k, x: state.zoomTransform.x, y: state.zoomTransform.y },
    snapshots: state.snapshots,
    paidUnlock: state.paidUnlock,
  };
};

const hydrateState = (data) => {
  state.selection = new Set(data.selection || []);
  state.hidden = new Set(data.hidden || []);
  state.styles = { ...state.styles, ...data.styles };
  state.countryStyles = new Map(data.countryStyles || []);
  state.countryPatterns = new Map(data.countryPatterns || []);
  state.choropleth = {
    ...state.choropleth,
    ...data.choropleth,
    data: new Map(data.choropleth?.data || []),
  };
  state.groups = data.groups || state.groups;
  state.pins = data.pins || [];
  state.texts = data.texts || [];
  state.legend = data.legend || state.legend;
  state.projectionType = data.projectionType || state.projectionType;
if (data.disputes) {
  state.disputes.enabled = !!data.disputes.enabled;
  state.disputes.style = data.disputes.style || state.disputes.style;
  state.disputes.labels = !!data.disputes.labels;

  // Per-feature toggles (if you still use them)
  state.disputes.enabledById = new Map(data.disputes.enabledById || []);

  // Group toggles (your current desired UX)
  state.disputes.enabledGroups = new Map(data.disputes.enabledGroups || []);
}
  if (data.zoomTransform) {
    state.zoomTransform = d3.zoomIdentity
      .translate(data.zoomTransform.x, data.zoomTransform.y)
      .scale(data.zoomTransform.k);
  } else {
    state.zoomTransform = state.zoomTransform;
  }
  state.snapshots = data.snapshots || [];
  state.paidUnlock = data.paidUnlock || false;
};

let saveTimeout;
const scheduleSave = () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
  }, 300);
};

const updateControls = () => {
  ui.selectedFill.value = state.styles.selectedFill;
if (ui.selectedPattern) ui.selectedPattern.value = state.styles.selectedPattern || "solid";
if (ui.patternColor) ui.patternColor.value = state.styles.patternColor || "#0f172a";

	ui.disputedMatchSelected.checked = !!state.styles.disputedMatchSelected;

	// If matching selected, show selected colour in the picker but keep it disabled
	ui.disputedFill.value = state.styles.disputedMatchSelected
	  ? state.styles.selectedFill
	  : (state.styles.disputedFill || state.styles.selectedFill);

	ui.disputedFill.disabled = !!state.styles.disputedMatchSelected;

  ui.nonSelectedFill.value = state.styles.nonSelectedFill;
  ui.nonSelectedOpacity.value = state.styles.nonSelectedOpacity * 100;
  ui.noDataFill.value = state.styles.noDataFill;
  if (ui.countryStroke) {
    ui.countryStroke.value = state.styles.countryStroke || "#94a3b8";
  }
  if (ui.countryStrokeWidth) {
    ui.countryStrokeWidth.value = state.styles.countryStrokeWidth ?? 0.5;
  }
  if (ui.countryBordersEnabled) {
    ui.countryBordersEnabled.checked = state.styles.countryBordersEnabled !== false;
  }

  if (ui.coastStroke) {
    ui.coastStroke.value = state.styles.coastStroke || "#94a3b8";
  }
  if (ui.coastStrokeWidth) {
    ui.coastStrokeWidth.value = state.styles.coastStrokeWidth ?? 0.5;
  }
  if (ui.coastBordersEnabled) {
    ui.coastBordersEnabled.checked = state.styles.coastBordersEnabled !== false;
  }
  ui.backgroundColor.value = state.styles.background;
  ui.scaleMode.value = state.choropleth.scaleMode;
  ui.bucketCount.value = state.choropleth.buckets;
  ui.minValue.value = state.choropleth.min ?? "";
  ui.maxValue.value = state.choropleth.max ?? "";
  ui.projectionSelect.value = state.projectionType;
  if (ui.mapDetail) ui.mapDetail.value = state.mapDetail || "110m";
  ui.seaEnabled.checked = !!state.styles.seaEnabled;
  ui.seaFill.value = state.styles.seaFill || "#93c5fd";
  ui.seaOpacity.value = Math.round((state.styles.seaOpacity ?? 1) * 100);
};

const exportSvg = () => {
  const svgClone = mapSvg.node().cloneNode(true);
  svgClone.querySelectorAll(".tooltip").forEach((node) => node.remove());
  svgClone.querySelectorAll(".text-editor").forEach((node) => node.remove());
  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const viewBox = svgClone.getAttribute("viewBox").split(" ").map(Number);
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("width", viewBox[2]);
  background.setAttribute("height", viewBox[3]);
  background.setAttribute("fill", state.styles.background);
  svgClone.insertBefore(background, svgClone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);
  downloadFile("world-map.svg", "image/svg+xml", svgString);
};

const exportRaster = async (type, transparent) => {
  const svgClone = mapSvg.node().cloneNode(true);
  const viewBox = mapSvg.node().getAttribute("viewBox").split(" ").map(Number);
  const width = 1920;
  const height = Math.round((viewBox[3] / viewBox[2]) * width);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!transparent) {
      ctx.fillStyle = state.styles.background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL(type === "jpeg" ? "image/jpeg" : "image/png");
    downloadDataUrl(
      `world-map.${type === "jpeg" ? "jpg" : "png"}`,
      dataUrl
    );
    URL.revokeObjectURL(url);
  };
  img.src = url;
};

const downloadFile = (filename, mime, content) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(filename, url);
  URL.revokeObjectURL(url);
};

const downloadDataUrl = (filename, url) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const importProject = async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    hydrateState(data);
    updateControls();
    renderGroups();
    renderSelectionList();
	renderSelectedCountries();
    renderSnapshots();
    renderLegendEditor();
    renderMap();
    scheduleSave();
  });
  input.click();
};

const exportProject = () => {
  downloadFile("world-map-project.json", "application/json", JSON.stringify(serializeState(), null, 2));
};

const unlockTransparent = () => {
  const paid = window.confirm(
    "Open payment link in a new tab? After payment you can unlock transparent PNG."
  );
  if (paid) {
    window.open("https://buy.stripe.com/your-link", "_blank", "noopener");
  }
  const confirmed = window.confirm("Have you already paid and want to unlock?" );
  if (confirmed) {
    state.paidUnlock = true;
    localStorage.setItem(UNLOCK_KEY, "true");
    alert("Transparent PNG unlocked on this device.");
  }
};
function renderMapIfSizeChanged() {
  if (mapWrap) {
    const rect = mapWrap.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    if (width === 0 || height === 0) return;

    const nextWidth = Math.max(width, 1);
    const nextHeight = Math.max(height, 1);

    if (nextWidth === lastMapSize.width && nextHeight === lastMapSize.height) return;

    renderMap();
    return;
  }

  const { width, height } = getMapDimensions();
  if (width === lastMapSize.width && height === lastMapSize.height) return;

  renderMap();
}


const attachEvents = () => {
  ui.countrySearch.addEventListener("input", (event) => updateSearchResults(event.target.value));
  ui.countrySearch.addEventListener("focus", () => updateSearchResults(ui.countrySearch.value));
  ui.countrySearch.addEventListener("blur", () =>
    setTimeout(() => ui.countryResults.classList.remove("open"), 200)
  );

  ui.selectFromSearch?.addEventListener("click", selectFromSearch);
  ui.hideFromSearch.addEventListener("click", hideFromSearch);

  ui.clearSelection.addEventListener("click", () => {
    state.selection.clear();
    updateMap();
    renderSelectedCountries();
    scheduleSave();
  });

  ui.applySelectedFill.addEventListener("click", applySelectedFill);

  ui.selectedFill.addEventListener("input", (event) => {
    // keep selected fill state in sync (in case applySelectedFill doesn't)
    state.styles.selectedFill = event.target.value;

    applySelectedFill();

    // keep disputed picker display in sync when matching
    if (state.styles.disputedMatchSelected && ui.disputedFill) {
      ui.disputedFill.value = state.styles.selectedFill;
    }
  });

  ui.nonSelectedFill.addEventListener("input", (event) => {
    state.styles.nonSelectedFill = event.target.value;
    updateMap();
    scheduleSave();
  });

  ui.nonSelectedOpacity.addEventListener("input", (event) => {
    state.styles.nonSelectedOpacity = Number(event.target.value) / 100;
    updateMap();
    scheduleSave();
  });

  ui.noDataFill.addEventListener("input", (event) => {
    state.styles.noDataFill = event.target.value;
    updateMap();
    scheduleSave();
  });

if (ui.clearCountryOverrides) {
  ui.clearCountryOverrides.addEventListener("click", () => {
    // Only clear overrides for currently selected countries
    state.selection.forEach((iso3) => {
      state.countryStyles.delete(iso3);
      state.countryPatterns.delete(iso3);
    });
    renderSelectedCountries();
    updateMap();
    scheduleSave();
  });
}
if (ui.selectedPattern) {
  ui.selectedPattern.addEventListener("change", (e) => {
    const pattern = e.target.value || "solid";
    state.styles.selectedPattern = pattern;

    // Auto-apply to selection immediately
    state.selection.forEach((iso3) => state.countryPatterns.set(iso3, pattern));

    renderSelectedCountries();
    updateMap();
    scheduleSave();
  });
}
ui.patternColor?.addEventListener("input", (e) => {
  state.styles.patternColor = e.target.value;

  // Pattern IDs are cached. If color changes, you must clear cache and rebuild defs.
  patternCache.clear();
  if (defsLayer) defsLayer.selectAll("*").remove();

  updateMap();
  scheduleSave();
});

  const syncSeaControls = () => {
    const enabled = !!state.styles.seaEnabled;
    ui.seaFill.disabled = !enabled;
    ui.seaOpacity.disabled = !enabled;
  };

  ui.seaEnabled.addEventListener("change", (event) => {
    state.styles.seaEnabled = event.target.checked;
    syncSeaControls();
    updateSea();
    scheduleSave();
  });

  ui.seaFill.addEventListener("input", (event) => {
    state.styles.seaFill = event.target.value;
    updateSea();
    scheduleSave();
  });

  ui.seaOpacity.addEventListener("input", (event) => {
    state.styles.seaOpacity = Number(event.target.value) / 100;
    updateSea();
    scheduleSave();
  });

  // Disputes enabled toggle
  ui.disputesEnabled?.addEventListener("change", (e) => {
    state.disputes.enabled = e.target.checked;

    // Force tint only (in case old saved states exist)
    state.disputes.style = "tint";

    updateMap();
    scheduleSave();
    renderDisputesListUI();
  });

  // Disputed colour controls
  ui.disputedMatchSelected?.addEventListener("change", () => {
    state.styles.disputedMatchSelected = ui.disputedMatchSelected.checked;

    if (ui.disputedFill) {
      ui.disputedFill.disabled = !!state.styles.disputedMatchSelected;

      // Keep the UI colour in sync when matching
      if (state.styles.disputedMatchSelected) {
        ui.disputedFill.value = state.styles.selectedFill;
      }
    }

    updateMap();
    scheduleSave();
  });

  ui.disputedFill?.addEventListener("input", () => {
    state.styles.disputedFill = ui.disputedFill.value;

    // If the user touches the picker, they’re choosing custom
    state.styles.disputedMatchSelected = false;
    if (ui.disputedMatchSelected) ui.disputedMatchSelected.checked = false;
    ui.disputedFill.disabled = false;

    updateMap();
    scheduleSave();
  });

  // Disputed list: Select all / Select none (group-based)
  if (ui.disputesSelectAll) {
    ui.disputesSelectAll.addEventListener("click", () => {
      // Turn overlay on so result is visible
      state.disputes.enabled = true;
      if (ui.disputesEnabled) ui.disputesEnabled.checked = true;

      // Force tint only
      state.disputes.style = "tint";

      // Enable all groups by clearing "false" overrides
      if (state.disputes?.enabledGroups instanceof Map) {
        state.disputes.enabledGroups.clear();
      } else {
        state.disputes.enabledGroups = new Map();
      }

      renderDisputesListUI?.();
      updateMap();
      scheduleSave();
    });
  }

  if (ui.disputesSelectNone) {
    ui.disputesSelectNone.addEventListener("click", () => {
      // Turn overlay on so result is visible
      state.disputes.enabled = true;
      if (ui.disputesEnabled) ui.disputesEnabled.checked = true;

      // Force tint only
      state.disputes.style = "tint";

      // Disable all groups explicitly
      if (!(state.disputes?.enabledGroups instanceof Map)) {
        state.disputes.enabledGroups = new Map();
      }

      (state.disputes.groupList || []).forEach((g) => {
        state.disputes.enabledGroups.set(g.id, false);
      });

      renderDisputesListUI?.();
      updateMap();
      scheduleSave();
    });
  }

  // You said: remove hatch/outline and keep only tint.
  // So do NOT attach ui.disputesStyle listener anymore.
  // ui.disputesStyle?.addEventListener("change", ...)  <-- remove this

  ui.disputesLabels?.addEventListener("change", (e) => {
    state.disputes.labels = e.target.checked;
    updateMap();
    scheduleSave();
  });

  console.log("disputes controls found", {
    enabled: !!ui.disputesEnabled,
    style: !!ui.disputesStyle, // this may exist in DOM, but we no longer wire it
    labels: !!ui.disputesLabels,
    selectAll: !!ui.disputesSelectAll,
    selectNone: !!ui.disputesSelectNone,
  });

  ui.resetColors.addEventListener("click", resetColors);
  ui.resetAll.addEventListener("click", resetAll);
  ui.addGroup.addEventListener("click", addGroup);
  ui.hideSelected.addEventListener("click", hideSelected);
  ui.isolateSelected.addEventListener("click", isolateSelected);
  ui.hideNoData.addEventListener("click", hideNoData);
  ui.unhideAll.addEventListener("click", unhideAll);

  ui.csvInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const rows = await parseCsv(file);
    applyChoropleth(rows);
    ui.dataWarnings.innerHTML = state.choropleth.warnings.map((warning) => `<div>${warning}</div>`).join("");
  });

  ui.applyChoropleth.addEventListener("click", () => {
    if (state.choropleth.data.size) {
      state.choropleth.active = true;
      updateLegendBins();
      renderLegendEditor();
      updateMap();
      scheduleSave();
    }
  });

  ui.clearChoropleth.addEventListener("click", () => {
    state.choropleth.active = false;
    state.choropleth.data.clear();
    ui.dataWarnings.innerHTML = "";
    updateMap();
    renderLegendEditor();
    scheduleSave();
  });

  ui.addText.addEventListener("click", () => {
    state.mode = "text";
    setMode("text");
  });

  ui.addPin.addEventListener("click", () => {
    state.mode = "pin";
    setMode("pin");
  });

  ui.annotationColor.addEventListener("input", () => scheduleSave());
  ui.annotationSize.addEventListener("input", () => scheduleSave());
  ui.annotationBg.addEventListener("input", () => scheduleSave());
  // NEW: pin styling controls apply to all pins + default styles
  const applyPinDefaultsToExistingPins = () => {
    state.pins.forEach((p) => {
      p.icon = state.styles.pinIcon;
      p.color = state.styles.pinColor;
      p.size = Number(state.styles.pinSize);

      p.labelTextColor = state.styles.pinLabelTextColor;
      p.labelBgColor = state.styles.pinLabelBgColor;
    });
    updateAnnotations();
    scheduleSave();
  };

  ui.pinIcon?.addEventListener("change", (e) => {
    state.styles.pinIcon = e.target.value;
    applyPinDefaultsToExistingPins();
  });

  ui.pinColor?.addEventListener("input", (e) => {
    state.styles.pinColor = e.target.value;
    applyPinDefaultsToExistingPins();
  });

  ui.pinSize?.addEventListener("input", (e) => {
    state.styles.pinSize = Number(e.target.value);
    applyPinDefaultsToExistingPins();
  });

  ui.pinLabelTextColor?.addEventListener("input", (e) => {
    state.styles.pinLabelTextColor = e.target.value;
    applyPinDefaultsToExistingPins();
  });

  ui.pinLabelBgColor?.addEventListener("input", (e) => {
    state.styles.pinLabelBgColor = e.target.value;
    applyPinDefaultsToExistingPins();
  });

  ui.saveSnapshot.addEventListener("click", saveSnapshot);

  ui.backgroundColor.addEventListener("input", (event) => {
    state.styles.background = event.target.value;
    mapSvg.style("background", state.styles.background);
    scheduleSave();
  });

  ui.importJson.addEventListener("click", importProject);
  ui.exportJson.addEventListener("click", exportProject);

  ui.exportSvg.addEventListener("click", exportSvg);
  ui.exportSvgAlt.addEventListener("click", exportSvg);

  ui.exportPng.addEventListener("click", () => exportRaster("png", false));
  ui.exportPngAlt.addEventListener("click", () => exportRaster("png", false));

  ui.exportJpg.addEventListener("click", () => exportRaster("jpeg", false));
  ui.exportJpgAlt.addEventListener("click", () => exportRaster("jpeg", false));

  ui.exportTransparent.addEventListener("click", () => {
    if (!state.paidUnlock) {
      alert("Transparent PNG is locked. Please unlock first.");
      return;
    }
    exportRaster("png", true);
  });

  ui.unlockTransparent.addEventListener("click", unlockTransparent);

  ui.projectionSelect.addEventListener("change", (event) => {
    state.projectionType = event.target.value;
    renderMap();
    scheduleSave();
  });
ui.mapDetail?.addEventListener("change", async (event) => {
  state.mapDetail = event.target.value;
  await reloadMapDetail();
  scheduleSave();
});

  ui.zoomIn.addEventListener("click", () => mapSvg.transition().call(zoomBehavior.scaleBy, 1.2));
  ui.zoomOut.addEventListener("click", () => mapSvg.transition().call(zoomBehavior.scaleBy, 0.8));

  ui.fitWorld.addEventListener("click", () => {
    mapSvg.transition().call(zoomBehavior.transform, d3.zoomIdentity);
    state.zoomTransform = d3.zoomIdentity;
  });

  ui.modeSelect.addEventListener("click", () => setMode("select"));
  ui.modeText.addEventListener("click", () => setMode("text"));
  ui.modePin.addEventListener("click", () => setMode("pin"));

  let resizePending = false;

  const scheduleStableMapRender = () => {
    if (resizePending) return;
    resizePending = true;

    if (!mapWrap) {
      requestAnimationFrame(() => {
        resizePending = false;
        renderMapIfSizeChanged();
      });
      return;
    }

    let lastWidth = 0;
    let lastHeight = 0;
    let stableFrames = 0;

    const checkStableSize = () => {
      const rect = mapWrap.getBoundingClientRect();
      const pad =
        Number(getComputedStyle(mapWrap).getPropertyValue("--map-pad").trim().replace("px", "")) || 0;

      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      const innerWidth = Math.max(1, width - pad * 2);
      const innerHeight = Math.max(1, height - pad * 2);

      const nextWidth = Math.round(width);
      const nextHeight = Math.round(height);

      if (nextWidth === 0 || nextHeight === 0) {
        stableFrames = 0;
      } else if (nextWidth === lastWidth && nextHeight === lastHeight) {
        stableFrames += 1;
      } else {
        lastWidth = nextWidth;
        lastHeight = nextHeight;
        stableFrames = 0;
      }

      if (stableFrames >= 1) {
        resizePending = false;
        renderMapIfSizeChanged();
        return;
      }

      requestAnimationFrame(checkStableSize);
    };

    requestAnimationFrame(checkStableSize);
  };

  syncSeaControls();

  window.addEventListener("resize", scheduleStableMapRender);

  if (mapWrap && "ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => {
      scheduleStableMapRender();
    });
    resizeObserver.observe(mapWrap);
  }

  scheduleStableMapRender();
};


const bootstrap = async () => {
  try {
    console.log("DATA_SOURCES", DATA_SOURCES);

    const [isoData, disputedData] = await Promise.all([
      fetchJsonWithFallback(DATA_SOURCES.iso),
      d3.json(DATA_SOURCES.disputed),
    ]);

    // Build ISO indexes once and stash them (so reloadMapDetail can reuse them)
    const { isoByName, isoByNumeric } = buildIsoIndexes(isoData);
    state._isoByName = isoByName;
    state._isoByNumeric = isoByNumeric;

    // --- Disputes setup ---
    state.disputes.features = disputedData?.features || [];

    const getDisputeGroupLabel = (f) => {
      const p = f?.properties || {};
      const group =
        p.admin ||
        p.ADMIN ||
        p.sov_a3 ||
        p.SOV_A3 ||
        p.geonunit ||
        p.GEONUNIT ||
        p.name ||
        p.NAME;

      return (group && String(group).trim()) ? String(group).trim() : "Other";
    };

    const groups = new Map(); // id -> { id, label, features[] }

    state.disputes.features.forEach((f, i) => {
      const label = getDisputeGroupLabel(f);
      const id = normalize(label).replace(/\s+/g, "-") || `group-${i}`;

      if (!groups.has(id)) {
        groups.set(id, { id, label, features: [] });
      }
      groups.get(id).features.push(f);
    });

    state.disputes.groupList = Array.from(groups.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    if (!state.disputes.enabledGroups || state.disputes.enabledGroups.size === 0) {
      state.disputes.enabledGroups = new Map();
      state.disputes.groupList.forEach((g) => state.disputes.enabledGroups.set(g.id, true));
    }

    // --- Preset groups ---
    await loadPresetGroups();
    state.groups = presetGroups.map((group) => ({ ...group, id: crypto.randomUUID() }));

    // --- Hydrate saved project ---
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      hydrateState(JSON.parse(stored));
    }

    // Ensure defaults exist even if older saves are missing them
    state.mapDetail = state.mapDetail || "110m";
    state.projectionType = state.projectionType || "mercator";

    // ✅ NOW load the topology for the (possibly hydrated) mapDetail
    const topology = await loadTopologyForDetail(state.mapDetail);
    applyTopologyToState(topology, isoByName, isoByNumeric);
    state.zoomTransform = d3.zoomIdentity;
    state.paidUnlock = localStorage.getItem(UNLOCK_KEY) === "true";

    updateControls();
    renderGroups();
    renderSnapshots();
    renderSelectionList();
    renderLegendEditor();
    renderDisputesListUI();
    attachEvents();
    setMode("select");
    mapSvg.style("background", state.styles.background);

    renderMap();
    updateMap();
  } catch (error) {
    console.error("Failed to load data", error);
  }
};

// select
bootstrap();