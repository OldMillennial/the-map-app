import * as d3 from "https://esm.sh/d3@7";
import { feature } from "https://esm.sh/topojson-client@3";
import * as d3GeoProjection from "https://esm.sh/d3-geo-projection@4";
import Papa from "https://esm.sh/papaparse@5.4.1";

const DATA_SOURCES = {
  topojson: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
  names: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.tsv",
  iso: [
    "https://cdn.jsdelivr.net/npm/iso-3166-1@2.1.1/iso-3166-1.json",
    "https://cdn.jsdelivr.net/npm/iso-3166-1@2.1.1/iso-3166.json",
    "https://unpkg.com/iso-3166-1@2.1.1/iso-3166-1.json",
  ],
};

const mapSvg = d3.select("#map");
const tooltip = document.querySelector("#tooltip");
const textEditor = document.querySelector("#text-editor");

const ui = {
  countrySearch: document.querySelector("#country-search"),
  countryResults: document.querySelector("#country-results"),
  selectFromSearch: document.querySelector("#select-from-search"),
  hideFromSearch: document.querySelector("#hide-from-search"),
  selectionSummary: document.querySelector("#selection-summary"),
  clearSelection: document.querySelector("#clear-selection"),
  selectedFill: document.querySelector("#selected-fill"),
  applySelectedFill: document.querySelector("#apply-selected-fill"),
  nonSelectedFill: document.querySelector("#nonselected-fill"),
  nonSelectedOpacity: document.querySelector("#nonselected-opacity"),
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
  zoomIn: document.querySelector("#zoom-in"),
  zoomOut: document.querySelector("#zoom-out"),
  fitWorld: document.querySelector("#fit-world"),
  modeSelect: document.querySelector("#mode-select"),
  modeText: document.querySelector("#mode-text"),
  modePin: document.querySelector("#mode-pin"),
};

const defaultState = () => ({
  countries: new Map(),
  features: [],
  selection: new Set(),
  hidden: new Set(),
  styles: {
    selectedFill: "#2563eb",
    nonSelectedFill: "#e2e8f0",
    nonSelectedOpacity: 0.7,
    noDataFill: "#cbd5f5",
    background: "#ffffff",
  },
  countryStyles: new Map(),
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
  legend: {
    title: "Legend",
    bins: [],
    position: { x: 40, y: 40 },
    visible: true,
    orientation: "vertical",
  },
  projectionType: "mercator",
  zoomTransform: d3.zoomIdentity,
  mode: "select",
  snapshots: [],
  paidUnlock: false,
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
const zoomBehavior = d3.zoom().scaleExtent([1, 8]).on("zoom", (event) => {
  mapSvg.select(".map-root").attr("transform", event.transform);
  state.zoomTransform = event.transform;
});

const presetGroups = [
  { name: "European Union (EU)", iso3List: ["AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE"] },
  { name: "OECD", iso3List: ["AUS", "AUT", "BEL", "CAN", "CHL", "COL", "CRI", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ISR", "ITA", "JPN", "KOR", "LVA", "LTU", "LUX", "MEX", "NLD", "NZL", "NOR", "POL", "PRT", "SVK", "SVN", "ESP", "SWE", "CHE", "TUR", "GBR", "USA"] },
  { name: "English (Official)", iso3List: ["AUS", "CAN", "GBR", "IRL", "NZL", "USA", "ZAF", "IND", "PAK", "NGA", "GHA", "KEN", "UGA", "TZA", "ZMB", "ZWE", "PHL", "SGP"] },
  { name: "BRICS", iso3List: ["BRA", "RUS", "IND", "CHN", "ZAF"] },
  { name: "G7", iso3List: ["CAN", "FRA", "DEU", "ITA", "JPN", "GBR", "USA"] },
  { name: "G20", iso3List: ["ARG", "AUS", "BRA", "CAN", "CHN", "FRA", "DEU", "IND", "IDN", "ITA", "JPN", "KOR", "MEX", "RUS", "SAU", "ZAF", "TUR", "GBR", "USA", "EUU"] },
  { name: "ASEAN", iso3List: ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM"] },
  { name: "GCC", iso3List: ["BHR", "KWT", "OMN", "QAT", "SAU", "ARE"] },
  { name: "African Union", iso3List: ["DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD", "COM", "COG", "COD", "CIV", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH", "GAB", "GMB", "GHA", "GIN", "GNB", "KEN", "LSO", "LBR", "LBY", "MDG", "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA", "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", "TUN", "UGA", "ZMB", "ZWE"] },
  { name: "OPEC", iso3List: ["DZA", "AGO", "COD", "GNQ", "GAB", "IRN", "IRQ", "KWT", "LBY", "NGA", "SAU", "ARE", "VEN"] },
  { name: "SAARC", iso3List: ["AFG", "BGD", "BTN", "IND", "MDV", "NPL", "PAK", "LKA"] },
  { name: "Mercosur", iso3List: ["ARG", "BOL", "BRA", "PRY", "URY", "VEN"] },
  { name: "USMCA", iso3List: ["CAN", "MEX", "USA"] },
  { name: "Global South", iso3List: ["DZA", "AGO", "ARG", "BGD", "BOL", "BRA", "CHL", "CHN", "COL", "COD", "EGY", "ETH", "GHA", "IND", "IDN", "IRN", "IRQ", "KEN", "MEX", "MAR", "NGA", "PAK", "PER", "PHL", "RUS", "SAU", "ZAF", "THA", "TUR", "VNM"] },
];

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
      projection = d3GeoProjection.geoEqualEarth();
      break;
    default:
      projection = d3.geoMercator();
      break;
  }
  projection.fitSize([width, height], { type: "Sphere" });
  path = d3.geoPath(projection);
};

const renderMap = () => {
  const width = mapSvg.node().clientWidth;
  const height = mapSvg.node().clientHeight;

  setupProjection(width, height);
  mapSvg.attr("viewBox", `0 0 ${width} ${height}`);

  mapSvg.selectAll("g").remove();
  const root = mapSvg.append("g").attr("class", "map-root");
  countryLayer = root.append("g").attr("class", "countries");
  pinLayer = root.append("g").attr("class", "pins");
  textLayer = root.append("g").attr("class", "texts");
  legendLayer = root.append("g").attr("class", "legend");

  countryLayer
    .selectAll("path")
    .data(state.features, (d) => d.properties.iso3)
    .join("path")
    .attr("class", "country")
    .attr("data-iso3", (d) => d.properties.iso3)
    .attr("d", path)
    .on("pointerover", handlePointerOver)
    .on("pointermove", handlePointerMove)
    .on("pointerout", handlePointerOut)
    .on("click", handleCountryClick);

  mapSvg.call(zoomBehavior);
  mapSvg.call(zoomBehavior.transform, state.zoomTransform);

  updateMap();
  updateAnnotations();
  renderLegend();
};

const updateMap = () => {
  countryLayer
    .selectAll("path")
    .attr("display", (d) => (state.hidden.has(d.properties.iso3) ? "none" : null))
    .attr("fill", (d) => getCountryFill(d.properties.iso3))
    .attr("fill-opacity", (d) => getCountryOpacity(d.properties.iso3))
    .attr("stroke", "#94a3b8")
    .attr("stroke-width", 0.5);

  updateSelectionSummary();
  updateLegendBinsUI();
  renderLegend();
};

const getCountryFill = (iso3) => {
  if (state.choropleth.active) {
    const value = state.choropleth.data.get(iso3);
    if (value === undefined || value === null || Number.isNaN(value)) {
      return state.styles.noDataFill;
    }
    return applyChoroplethColor(value);
  }

  if (state.selection.has(iso3)) {
    return state.countryStyles.get(iso3) || state.styles.selectedFill;
  }
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
  if (state.mode === "text") {
    addTextAtEvent(event);
    return;
  }
  if (state.mode === "pin") {
    addPinFromFeature(feature);
    return;
  }

  const iso3 = feature.properties.iso3;
  const multi = event.shiftKey;
  if (!multi) {
    state.selection.clear();
  }
  if (state.selection.has(iso3)) {
    state.selection.delete(iso3);
  } else {
    state.selection.add(iso3);
  }
  updateMap();
  renderSelectionList();
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
  const rect = tooltip.getBoundingClientRect();
  let x = clientX + 12;
  let y = clientY + 12;
  if (x + rect.width > window.innerWidth) {
    x = clientX - rect.width - 12;
  }
  if (y + rect.height > window.innerHeight) {
    y = clientY - rect.height - 12;
  }
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
      ui.countrySearch.value = entry.name;
      ui.countrySearch.dataset.iso3 = entry.iso3;
      ui.countryResults.classList.remove("open");
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
  state.styles.selectedFill = "#2563eb";
  state.styles.nonSelectedFill = "#e2e8f0";
  state.styles.nonSelectedOpacity = 0.7;
  state.styles.noDataFill = "#cbd5f5";
  updateControls();
  updateMap();
  scheduleSave();
};

const resetAll = () => {
  const fresh = defaultState();
  Object.assign(state, fresh);
  state.groups = [...presetGroups.map((group) => ({ ...group, id: crypto.randomUUID() }))];
  updateControls();
  renderGroups();
  renderSnapshots();
  renderSelectionList();
  renderLegendEditor();
  renderMap();
  mapSvg.style("background", state.styles.background);
  scheduleSave();
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
    hide.textContent = "Hide";
    hide.addEventListener("click", () => hideGroup(group));
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
  group.iso3List.forEach((iso3) => state.hidden.add(iso3));
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
    color: ui.annotationColor.value,
    label: feature.properties.name,
  });
  updateAnnotations();
  renderSelectionList();
  scheduleSave();
};

const updateAnnotations = () => {
  pinLayer
    .selectAll("circle.pin")
    .data(state.pins, (d) => d.id)
    .join((enter) =>
      enter
        .append("circle")
        .attr("class", "pin")
        .attr("r", 6)
        .call(
          d3.drag().on("drag", (event, d) => {
            const coords = projection.invert([event.x, event.y]);
            if (coords) {
              d.lng = coords[0];
              d.lat = coords[1];
            }
            updateAnnotations();
          })
        )
    )
    .attr("cx", (d) => projection([d.lng, d.lat])[0])
    .attr("cy", (d) => projection([d.lng, d.lat])[1])
    .attr("fill", (d) => d.color || "#1f2937")
    .attr("stroke", "#0f172a")
    .attr("stroke-width", 1);

  pinLayer
    .selectAll("text.pin-label")
    .data(state.pins.filter((pin) => pin.label), (d) => d.id)
    .join("text")
    .attr("class", "pin-label")
    .attr("x", (d) => projection([d.lng, d.lat])[0] + 8)
    .attr("y", (d) => projection([d.lng, d.lat])[1] + 4)
    .text((d) => d.label)
    .attr("font-size", 12)
    .attr("fill", "#0f172a");

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
    choropleth: {
      active: state.choropleth.active,
      data: Array.from(state.choropleth.data.entries()),
      scaleMode: state.choropleth.scaleMode,
      buckets: state.choropleth.buckets,
      min: state.choropleth.min,
      max: state.choropleth.max,
      warnings: state.choropleth.warnings,
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
  ui.nonSelectedFill.value = state.styles.nonSelectedFill;
  ui.nonSelectedOpacity.value = state.styles.nonSelectedOpacity * 100;
  ui.noDataFill.value = state.styles.noDataFill;
  ui.backgroundColor.value = state.styles.background;
  ui.scaleMode.value = state.choropleth.scaleMode;
  ui.bucketCount.value = state.choropleth.buckets;
  ui.minValue.value = state.choropleth.min ?? "";
  ui.maxValue.value = state.choropleth.max ?? "";
  ui.projectionSelect.value = state.projectionType;
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

const attachEvents = () => {
  ui.countrySearch.addEventListener("input", (event) => updateSearchResults(event.target.value));
  ui.countrySearch.addEventListener("focus", () => updateSearchResults(ui.countrySearch.value));
  ui.countrySearch.addEventListener("blur", () => setTimeout(() => ui.countryResults.classList.remove("open"), 200));
  ui.selectFromSearch.addEventListener("click", selectFromSearch);
  ui.hideFromSearch.addEventListener("click", hideFromSearch);
  ui.clearSelection.addEventListener("click", () => {
    state.selection.clear();
    updateMap();
  });
  ui.applySelectedFill.addEventListener("click", applySelectedFill);
  ui.selectedFill.addEventListener("input", applySelectedFill);
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
  ui.zoomIn.addEventListener("click", () => mapSvg.transition().call(zoomBehavior.scaleBy, 1.2));
  ui.zoomOut.addEventListener("click", () => mapSvg.transition().call(zoomBehavior.scaleBy, 0.8));
  ui.fitWorld.addEventListener("click", () => {
    mapSvg.transition().call(zoomBehavior.transform, d3.zoomIdentity);
    state.zoomTransform = d3.zoomIdentity;
  });
  ui.modeSelect.addEventListener("click", () => setMode("select"));
  ui.modeText.addEventListener("click", () => setMode("text"));
  ui.modePin.addEventListener("click", () => setMode("pin"));
};

const bootstrap = async () => {
  try {
    const [topology, nameData, isoData] = await Promise.all([
      d3.json(DATA_SOURCES.topojson),
      d3.tsv(DATA_SOURCES.names),
      fetchJsonWithFallback(DATA_SOURCES.iso),
    ]);

    const isoByName = new Map();
    const isoByNumeric = new Map();
    if (isoData?.countries) {
      isoData.countries.forEach((country) => {
        isoByName.set(normalize(country.country), country.alpha3);
        if (country.numeric) {
          isoByNumeric.set(String(country.numeric).padStart(3, "0"), country.alpha3);
        }
      });
    }

    const nameById = new Map();
    nameData.forEach((row) => {
      nameById.set(row.id, row.name);
    });

    const geojson = feature(topology, topology.objects.countries);
    state.features = geojson.features
      .filter((feature) => feature.id !== "010" && feature.properties?.name !== "Antarctica")
      .map((feature) => {
        const name = nameById.get(feature.id) || feature.properties?.name || "Unknown";
        const normalized = normalize(name);
        const iso3 =
          aliasMap.get(normalized) ||
          isoByName.get(normalized) ||
          isoByNumeric.get(String(feature.id));
        return {
          ...feature,
          properties: {
            ...feature.properties,
            name,
            iso3: iso3 || `UNK-${feature.id}`,
          },
        };
      });

    state.features.forEach((feature) => {
      state.countries.set(feature.properties.iso3, {
        name: feature.properties.name,
        iso3: feature.properties.iso3,
      });
    });

    state.groups = [...presetGroups.map((group) => ({ ...group, id: crypto.randomUUID() }))];

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      hydrateState(JSON.parse(stored));
    }
    state.paidUnlock = localStorage.getItem(UNLOCK_KEY) === "true";

    updateControls();
    renderGroups();
    renderSnapshots();
    renderSelectionList();
    renderLegendEditor();
    renderMap();
    attachEvents();
    setMode("select");
    mapSvg.style("background", state.styles.background);
  } catch (error) {
    console.error("Failed to load data", error);
  }
};

bootstrap();
