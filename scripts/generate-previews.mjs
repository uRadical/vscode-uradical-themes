#!/usr/bin/env node
// Renders an accurate code-sample preview SVG for each theme by reading the
// theme's own colors. Run: node scripts/generate-previews.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const THEMES = [
  { file: "uradical-dark-color-theme.json", out: "preview-dark" },
  { file: "uradical-light-color-theme.json", out: "preview-light" },
  { file: "uradical-pastel-dark-color-theme.json", out: "preview-pastel-dark" },
  { file: "uradical-pastel-light-color-theme.json", out: "preview-pastel-light" },
];

// One representative scope per syntax role.
const ROLE_SCOPE = {
  comment: "comment",
  string: "string",
  keyword: "keyword",
  func: "entity.name.function",
  type: "entity.name.type",
  constant: "constant.numeric",
  property: "support.type.property-name",
  operator: "keyword.operator",
  variable: "variable",
  punct: "punctuation",
};

function tokenColor(theme, scope) {
  for (const t of theme.tokenColors ?? []) {
    const scopes = Array.isArray(t.scope) ? t.scope : [t.scope];
    if (scopes.includes(scope)) return t.settings;
  }
  return null;
}

function color(theme, role) {
  if (role === "plain") return { foreground: theme.colors["editor.foreground"] };
  return tokenColor(theme, ROLE_SCOPE[role]) ?? { foreground: theme.colors["editor.foreground"] };
}

// Code sample as [role, text] runs per line.
const SAMPLE = [
  [["keyword", "import"], ["plain", " "], ["punct", "{ "], ["variable", "palette"], ["punct", " }"], ["plain", " "], ["keyword", "from"], ["plain", " "], ["string", "\"./brand\""], ["punct", ";"]],
  [],
  [["comment", "// uRadical brand-aligned theme"]],
  [["keyword", "export"], ["plain", " "], ["keyword", "const"], ["plain", " "], ["variable", "scheme"], ["operator", " = "], ["punct", "{"]],
  [["plain", "  "], ["property", "navy"], ["punct", ": "], ["string", "\"#0C1A50\""], ["punct", ","]],
  [["plain", "  "], ["property", "accents"], ["punct", ": ["], ["string", "\"#5DB1FF\""], ["punct", ", "], ["string", "\"#9F72E1\""], ["punct", ", "], ["string", "\"#F659A8\""], ["punct", "],"]],
  [["plain", "  "], ["property", "contrast"], ["punct", ": "], ["constant", "4.5"], ["punct", ","]],
  [["punct", "}"], ["punct", ";"]],
  [],
  [["keyword", "function"], ["plain", " "], ["func", "applyTheme"], ["punct", "("], ["variable", "el"], ["punct", ": "], ["type", "HTMLElement"], ["punct", ") {"]],
  [["plain", "  "], ["variable", "el"], ["punct", "."], ["property", "style"], ["punct", "."], ["property", "background"], ["operator", " = "], ["variable", "scheme"], ["punct", "."], ["property", "navy"], ["punct", ";"]],
  [["plain", "  "], ["keyword", "return"], ["plain", " "], ["constant", "true"], ["punct", ";"]],
  [["punct", "}"]],
];

const FONT = "'SF Mono','JetBrains Mono','Fira Code',Menlo,Consolas,monospace";
const FS = 15, LH = 24, PADX = 22, CHAR_W = 9.02;
const TOP = 52; // title bar height
const GUTTER = 44;

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(theme, label) {
  const bg = theme.colors["editor.background"];
  const lnFg = theme.colors["editorLineNumber.foreground"];
  const titleBg = theme.colors["editorGroupHeader.tabsBackground"] ?? bg;
  const titleFg = theme.colors["tab.activeForeground"] ?? theme.colors["editor.foreground"];
  const width = 720;
  const height = TOP + SAMPLE.length * LH + 16;

  let rows = "";
  SAMPLE.forEach((line, i) => {
    const y = TOP + 18 + i * LH;
    rows += `<text x="${PADX}" y="${y}" fill="${lnFg}" font-size="${FS - 2}">${String(i + 1).padStart(2, " ")}</text>`;
    let x = PADX + GUTTER;
    for (const [role, text] of line) {
      const s = color(theme, role);
      const italic = s.fontStyle && s.fontStyle.includes("italic") ? ` font-style="italic"` : "";
      const bold = s.fontStyle && s.fontStyle.includes("bold") ? ` font-weight="700"` : "";
      rows += `<text x="${x.toFixed(1)}" y="${y}" fill="${s.foreground}"${italic}${bold} xml:space="preserve">${esc(text)}</text>`;
      x += text.length * CHAR_W;
    }
  });

  const dots = ["#F659A8", "#E1C631", "#5DB1FF"]
    .map((c, i) => `<circle cx="${PADX + i * 22}" cy="26" r="6.5" fill="${c}"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">
  <rect width="${width}" height="${height}" rx="12" fill="${bg}"/>
  <path d="M0 12 Q0 0 12 0 H${width - 12} Q${width} 0 ${width} 12 V${TOP} H0 Z" fill="${titleBg}"/>
  ${dots}
  <text x="${width / 2}" y="31" text-anchor="middle" fill="${titleFg}" font-size="13" font-weight="600">${esc(label)}</text>
  ${rows}
</svg>`;
}

for (const { file, out } of THEMES) {
  const theme = JSON.parse(readFileSync(join(ROOT, "themes", file), "utf8"));
  const svg = render(theme, theme.name);
  writeFileSync(join(ROOT, "assets", `${out}.svg`), svg);
  console.log(`wrote assets/${out}.svg`);
}
