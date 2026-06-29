const fs = require("fs");
const path = require("path");

const LIST_PATH = path.join(__dirname, "..", "list.md");
const TRACKING_PARAMS = {
  utm_source: "reddit",
  utm_medium: "social",
  utm_campaign: "scapelikes",
};
const STEAM_CURATOR_CLAN_ID = "46043738";

const mode = process.argv.includes("--write")
  ? "write"
  : process.argv.includes("--check")
    ? "check"
    : null;

if (!mode) {
  console.error("Usage: node scripts/validate-list.js --check|--write");
  process.exit(2);
}

const original = fs.readFileSync(LIST_PATH, "utf8");
const updated = normalizeMarkdown(original);

if (updated !== original) {
  if (mode === "write") {
    fs.writeFileSync(LIST_PATH, updated);
    console.log("Updated list.md.");
  } else {
    console.error("list.md is not normalized. Run `npm run update:list`.");
    process.exit(1);
  }
} else {
  console.log("list.md is normalized.");
}

function normalizeMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isTableHeader(lines[index], lines[index + 1])) {
      continue;
    }

    const firstRowIndex = index + 2;
    let rowEndIndex = firstRowIndex;
    while (rowEndIndex < lines.length && isTableRow(lines[rowEndIndex])) {
      rowEndIndex += 1;
    }

    const rows = lines
      .slice(firstRowIndex, rowEndIndex)
      .map((line) => normalizeRow(line))
      .sort(compareRowsByTitle);

    lines.splice(firstRowIndex, rows.length, ...rows);
    index = rowEndIndex - 1;
  }

  return lines.join("\n");
}

function isTableHeader(line, nextLine) {
  return (
    isTableRow(line) &&
    splitRow(line)[0].trim().toLowerCase() === "title" &&
    /^\|?[\s:-]+\|[\s|:-]+$/.test(nextLine.trim())
  );
}

function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function normalizeRow(line) {
  return line.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, url) => {
    const normalizedUrl = normalizeUrl(url);
    const normalizedLabel = getCanonicalLabel(normalizedUrl) ?? label;
    return `[${normalizedLabel}](${normalizedUrl})`;
  });
}

function normalizeUrl(url) {
  const repairedUrl = repairMissingQueryMarker(url);
  let parsed;

  try {
    parsed = new URL(repairedUrl);
  } catch {
    return repairedUrl;
  }

  for (const [name, value] of Object.entries(TRACKING_PARAMS)) {
    parsed.searchParams.set(name, value);
  }

  if (isSteamStoreUrl(parsed.href)) {
    parsed.searchParams.set("curator_clanid", STEAM_CURATOR_CLAN_ID);
  }

  return parsed.href;
}

function repairMissingQueryMarker(url) {
  if (url.includes("?")) {
    return url;
  }

  return url.replace(/&(?=(?:utm_source|utm_medium|utm_campaign|curator_clanid)=)/, "?");
}

function isSteamStoreUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase() === "store.steampowered.com";
  } catch {
    return false;
  }
}

function getCanonicalLabel(url) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "store.steampowered.com") {
    return "Steam";
  }

  if (hostname === "itch.io" || hostname.endsWith(".itch.io")) {
    return "Itch";
  }

  if (hostname === "x.com") {
    return "X";
  }

  if (hostname === "play.google.com") {
    return "Android";
  }

  if (hostname === "apps.apple.com") {
    return "iOS";
  }

  return null;
}

function compareRowsByTitle(left, right) {
  return getTitle(left).localeCompare(getTitle(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getTitle(row) {
  return splitRow(row)[0].trim();
}

function splitRow(row) {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
}
