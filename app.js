import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

const mapSvg = d3.select("#map");
const dropdown = document.querySelector("#country-dropdown");
const input = document.querySelector("#country-input");
const tableBody = document.querySelector("#selection-table");
const downloadButton = document.querySelector("#download-btn");

const colorPalette = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#facc15",
  "#0ea5e9",
  "#e11d48",
  "#10b981",
];

let countries = [];
let countryFeatures = [];
let selection = [];
let paletteIndex = 0;

const projection = d3.geoNaturalEarth1();
const path = d3.geoPath(projection);

async function loadData() {
  const [countryResponse, topoResponse] = await Promise.all([
    fetch("data/countries.json"),
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  ]);

  countries = await countryResponse.json();
  const topology = await topoResponse.json();

  const geojson = feature(topology, topology.objects.countries);
  const normalizeName = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z\s]/g, "")
      .trim();

  const countryLookup = new Map(
    countries.map((country) => [normalizeName(country.name), country.iso2])
  );

  countryFeatures = geojson.features
    .filter((feature) => feature.properties?.name !== "Antarctica")
    .map((feature) => {
      const name = feature.properties?.name || "";
      const iso2 = countryLookup.get(normalizeName(name)) || "";
      return {
        ...feature,
        properties: {
          ...feature.properties,
          iso2,
        },
      };
    });

  renderMap();
  renderDropdown(countries);
}

function renderMap() {
  const width = mapSvg.node().clientWidth;
  const height = mapSvg.node().clientHeight;

  projection.fitSize([width, height], { type: "Sphere" });

  mapSvg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .selectAll("path.country")
    .data(countryFeatures, (d) => d.id)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("data-name", (d) => d.properties.name || "");

  updateMapColors();
}

function renderDropdown(list) {
  dropdown.innerHTML = "";
  if (!list.length) {
    dropdown.classList.remove("open");
    return;
  }

  list.forEach((country) => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.dataset.name = country.name;
    item.dataset.iso2 = country.iso2;

    const flag = document.createElement("img");
    flag.alt = `${country.name} flag`;
    flag.src = `flags/flag-${country.iso2.toLowerCase()}.svg`;

    const label = document.createElement("span");
    label.textContent = `${country.name} (${country.iso2})`;

    item.append(flag, label);
    item.addEventListener("click", () => selectCountry(country));
    dropdown.appendChild(item);
  });

  dropdown.classList.add("open");
}

function selectCountry(country) {
  if (selection.find((entry) => entry.iso2 === country.iso2)) {
    input.value = "";
    dropdown.classList.remove("open");
    return;
  }

  selection.push({
    ...country,
    color: colorPalette[paletteIndex % colorPalette.length],
  });
  paletteIndex += 1;

  input.value = "";
  dropdown.classList.remove("open");
  renderTable();
  updateMapColors();
}

function renderTable() {
  tableBody.innerHTML = "";

  selection.forEach((country) => {
    const row = document.createElement("tr");

    const flagCell = document.createElement("td");
    flagCell.className = "flag-cell";
    const flag = document.createElement("img");
    flag.src = `flags/flag-${country.iso2.toLowerCase()}.svg`;
    flag.alt = `${country.name} flag`;
    flagCell.appendChild(flag);

    const nameCell = document.createElement("td");
    nameCell.textContent = country.name;

    const colorCell = document.createElement("td");
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch";
    swatch.style.setProperty("--swatch", country.color);

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = country.color;
    colorInput.className = "visually-hidden";

    swatch.addEventListener("click", () => colorInput.click());
    colorInput.addEventListener("input", (event) => {
      country.color = event.target.value;
      swatch.style.setProperty("--swatch", country.color);
      updateMapColors();
    });

    colorCell.append(swatch, colorInput);

    const removeCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </svg>
    `;
    removeBtn.addEventListener("click", () => {
      selection = selection.filter((entry) => entry.iso2 !== country.iso2);
      renderTable();
      updateMapColors();
    });

    removeCell.appendChild(removeBtn);

    row.append(flagCell, nameCell, colorCell, removeCell);
    tableBody.appendChild(row);
  });
}

function updateMapColors() {
  const colorByIso = new Map(
    selection.map((entry) => [entry.iso2.toLowerCase(), entry.color])
  );

  mapSvg.selectAll("path.country").attr("fill", (d) => {
    const iso2 = (d.properties.iso2 || "").toLowerCase();
    return colorByIso.get(iso2) || "#e2e8f0";
  });
}

function filterCountries(term) {
  const value = term.trim().toLowerCase();
  if (!value) {
    renderDropdown(countries.slice(0, 25));
    return;
  }

  const filtered = countries.filter((country) => {
    const nameMatch = country.name.toLowerCase().includes(value);
    const codeMatch = country.iso2.toLowerCase().includes(value);
    return nameMatch || codeMatch;
  });

  renderDropdown(filtered.slice(0, 25));
}

function handleDownload() {
  const svgNode = mapSvg.node();
  const { width, height } = svgNode.getBoundingClientRect();

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgNode);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "custom-map.jpg";
      link.click();
      URL.revokeObjectURL(link.href);
    }, "image/jpeg", 0.95);
  };
  image.src = url;
}

input.addEventListener("input", (event) => filterCountries(event.target.value));
input.addEventListener("focus", () => filterCountries(input.value));

window.addEventListener("click", (event) => {
  if (!dropdown.contains(event.target) && event.target !== input) {
    dropdown.classList.remove("open");
  }
});

window.addEventListener("resize", renderMap);

downloadButton.addEventListener("click", handleDownload);

loadData();
