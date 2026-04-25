import { gunzipSync } from "node:zlib";
import { join } from "node:path";

export const ENV_ORDER = [
  "PLAUD_BASE_URL",
  "PLAUD_AUTHORIZATION",
  "PLAUD_X_DEVICE_ID",
  "PLAUD_X_PLD_TAG",
  "PLAUD_X_PLD_USER",
  "PLAUD_APP_LANGUAGE",
  "PLAUD_APP_PLATFORM",
  "PLAUD_EDIT_FROM",
  "PLAUD_ORIGIN",
  "PLAUD_REFERER",
  "PLAUD_TIMEZONE",
];

const HEADER_TO_ENV = {
  authorization: "PLAUD_AUTHORIZATION",
  "x-device-id": "PLAUD_X_DEVICE_ID",
  "x-pld-tag": "PLAUD_X_PLD_TAG",
  "x-pld-user": "PLAUD_X_PLD_USER",
  "app-language": "PLAUD_APP_LANGUAGE",
  "app-platform": "PLAUD_APP_PLATFORM",
  "edit-from": "PLAUD_EDIT_FROM",
  origin: "PLAUD_ORIGIN",
  referer: "PLAUD_REFERER",
  timezone: "PLAUD_TIMEZONE",
};

const DEFAULT_ENV = {
  PLAUD_APP_LANGUAGE: "en",
  PLAUD_APP_PLATFORM: "web",
  PLAUD_EDIT_FROM: "web",
  PLAUD_ORIGIN: "https://web.plaud.ai",
  PLAUD_REFERER: "https://web.plaud.ai/",
  PLAUD_TIMEZONE: "Asia/Seoul",
};

const CONTENT_GROUPS = {
  transaction: "transcript",
  auto_sum_note: "summary",
  sum_multi_note: "summary",
  outline: "outline",
  high_light: "highlight",
  mark_memo: "markMemo",
  consumer_note: "markMemo",
};

export function splitShellLike(input) {
  const tokens = [];
  let current = "";
  let quote = null;
  let escaped = false;

  for (const char of input.replace(/\\\r?\n/g, " ").trim()) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }

    if ((char === "'" || char === "\"") && quote === null) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = null;
      continue;
    }

    if (/\s/.test(char) && quote === null) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

export function parseCopiedCurl(curlText) {
  const tokens = splitShellLike(curlText);
  if (tokens[0] !== "curl") {
    throw new Error("input does not start with curl");
  }

  let requestUrl = "";
  const headers = {};

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token === "-H" || token === "--header") {
      const header = tokens[++i];
      if (!header || !header.includes(":")) {
        throw new Error("invalid curl header");
      }
      const [name, ...valueParts] = header.split(":");
      headers[name.trim().toLowerCase()] = valueParts.join(":").trim();
      continue;
    }

    if (!requestUrl && /^https?:\/\//.test(token)) {
      requestUrl = token;
    }
  }

  if (!requestUrl) {
    throw new Error("curl command did not contain a URL");
  }

  const url = new URL(requestUrl);
  const env = {
    PLAUD_BASE_URL: `${url.protocol}//${url.host}`,
    ...DEFAULT_ENV,
  };

  for (const [headerName, envName] of Object.entries(HEADER_TO_ENV)) {
    if (headers[headerName]) {
      env[envName] = normalizeAuthorization(headers[headerName], envName);
    }
  }

  const missing = [
    "PLAUD_AUTHORIZATION",
    "PLAUD_X_DEVICE_ID",
    "PLAUD_X_PLD_TAG",
    "PLAUD_X_PLD_USER",
  ].filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`missing required headers: ${missing.join(", ")}`);
  }

  return Object.fromEntries(ENV_ORDER.filter((key) => env[key]).map((key) => [key, env[key]]));
}

function normalizeAuthorization(value, envName) {
  if (envName !== "PLAUD_AUTHORIZATION") {
    return value;
  }

  if (value.toLowerCase().startsWith("bearer ")) {
    return `bearer ${value.split(/\s+/, 2)[1]}`;
  }

  return value;
}

export function parseEnvText(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    env[key] = unquoteEnvValue(line.slice(separator + 1).trim());
  }

  return env;
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("\"") && value.endsWith("\""))
  ) {
    return value.slice(1, -1).replace(/'"'"'/g, "'");
  }

  return value;
}

export function renderEnvText(env) {
  return `${ENV_ORDER.filter((key) => env[key])
    .map((key) => `${key}=${shellQuote(env[key])}`)
    .join("\n")}\n`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

export function buildPlaudHeaders(env) {
  return {
    accept: "application/json, text/plain, */*",
    "app-language": env.PLAUD_APP_LANGUAGE ?? DEFAULT_ENV.PLAUD_APP_LANGUAGE,
    "app-platform": env.PLAUD_APP_PLATFORM ?? DEFAULT_ENV.PLAUD_APP_PLATFORM,
    authorization: env.PLAUD_AUTHORIZATION,
    "edit-from": env.PLAUD_EDIT_FROM ?? DEFAULT_ENV.PLAUD_EDIT_FROM,
    origin: env.PLAUD_ORIGIN ?? DEFAULT_ENV.PLAUD_ORIGIN,
    referer: env.PLAUD_REFERER ?? DEFAULT_ENV.PLAUD_REFERER,
    timezone: env.PLAUD_TIMEZONE ?? DEFAULT_ENV.PLAUD_TIMEZONE,
    "x-device-id": env.PLAUD_X_DEVICE_ID,
    "x-pld-tag": env.PLAUD_X_PLD_TAG,
    "x-pld-user": env.PLAUD_X_PLD_USER,
  };
}

export function assertPlaudSuccess(payload) {
  if (payload?.status !== 0) {
    throw new Error(`Plaud API error: ${payload?.msg ?? payload?.error ?? "unknown error"}`);
  }
}

export function extractContentLinks(detailPayload) {
  const result = {
    transcript: [],
    summary: [],
    outline: [],
    highlight: [],
    markMemo: [],
    all: [],
  };

  for (const item of detailPayload?.data?.content_list ?? []) {
    const group = CONTENT_GROUPS[item.data_type];
    if (!group || item.task_status !== 1 || !item.data_link) {
      continue;
    }

    const link = {
      type: item.data_type,
      title: item.data_title || item.data_tab_name || "",
      url: item.data_link,
    };
    result[group].push(link);
    result.all.push(link);
  }

  return result;
}

export function parseTranscriptPayload(buffer) {
  const text = decodeMaybeGzip(buffer);
  const payload = JSON.parse(text);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.segments)) {
    return payload.segments;
  }

  return [];
}

export function decodeMaybeGzip(buffer) {
  const bytes = Buffer.from(buffer);
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  return (isGzip ? gunzipSync(bytes) : bytes).toString("utf8");
}

export function extensionFromUrl(urlString, fallback = "bin") {
  const pathname = new URL(urlString).pathname;
  const basename = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const extension = basename.includes(".") ? basename.split(".").at(-1) : "";
  return extension || fallback;
}

export function sanitizeFilenamePrefix(value) {
  return (value || "plfetch-file")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .trim()
    .replace(/^[ ._]+|[ ._]+$/g, "") || "plfetch-file";
}

export function buildOutputFilename(displayName, fileId, extension) {
  return `${sanitizeFilenamePrefix(displayName)}__${fileId}.${extension}`;
}

export function getDefaultPaths(homeDir) {
  return {
    envPath: join(homeDir, ".config", "plfetch", ".env"),
    downloadDir: join(homeDir, "Downloads", "plfetch"),
  };
}
