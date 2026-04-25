#!/usr/bin/env bun
import { mkdir, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import {
  assertPlaudSuccess,
  buildOutputFilename,
  buildPlaudHeaders,
  decodeMaybeGzip,
  extensionFromUrl,
  extractContentLinks,
  getDefaultPaths,
  parseCopiedCurl,
  parseEnvText,
  parseTranscriptPayload,
  renderEnvText,
  sanitizeFilenamePrefix,
} from "../src/core.js";

const DEFAULT_PATHS = getDefaultPaths(process.env.HOME ?? process.cwd());
const DEFAULT_ENV_PATH = DEFAULT_PATHS.envPath;
const DEFAULT_DOWNLOAD_DIR = DEFAULT_PATHS.downloadDir;

async function main(argv) {
  const [command, ...args] = argv;

  try {
    switch (command) {
      case "onboard":
        return await onboard(args);
      case "list":
        return await listFiles(args);
      case "contents":
        return await contents(args);
      case "download":
        return await download(args);
      case "transcript":
        return await fetchGeneratedContent("transcript", args);
      case "summary":
        return await fetchGeneratedContent("summary", args);
      case "help":
      case "--help":
      case "-h":
      case undefined:
        return usage();
      default:
        throw new Error(`unknown command: ${command}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

function usage() {
  console.log(`Usage:
  plfetch onboard [--env PATH]
  plfetch list [limit] [skip] [--env PATH]
  plfetch contents <fileId> [--env PATH]
  plfetch download <fileId> [--output-dir DIR] [--force] [--env PATH]
  plfetch transcript <fileId> [--output-dir DIR] [--force] [--env PATH]
  plfetch summary <fileId> [--output-dir DIR] [--force] [--env PATH]
`);
}

async function onboard(args) {
  const options = parseOptions(args);
  const envPath = resolve(options.env ?? DEFAULT_ENV_PATH);

  if (process.stdin.isTTY) {
    console.error("Paste a copied Plaud cURL into stdin, then press Ctrl-D.");
  }

  const curlText = await Bun.stdin.text();
  const env = parseCopiedCurl(curlText);
  await mkdir(dirname(envPath), { recursive: true });

  let backupPath = "";
  if (existsSync(envPath)) {
    backupPath = `${envPath}.bak.${timestamp()}`;
    await rename(envPath, backupPath);
  }

  await writeFile(envPath, renderEnvText(env), { mode: 0o600 });
  printJson({ status: "configured", envPath, backupPath: backupPath || null });
}

async function listFiles(args) {
  const positional = [];
  const options = parseOptions(args, positional);
  const limit = Number(positional[0] ?? 20);
  const skip = Number(positional[1] ?? 0);
  const client = await createClient(options.env);

  const payload = await client.getJson("/file/simple/web", {
    skip,
    limit,
    is_trash: 0,
    sort_by: "edit_time",
    is_desc: true,
  });

  printJson({
    total: payload.data_file_total ?? 0,
    items: (payload.data_file_list ?? []).map((item) => ({
      id: item.id,
      filename: item.filename,
      fullname: item.fullname,
      filesize: item.filesize,
      duration: item.duration,
      editFrom: item.edit_from,
      editTime: item.edit_time,
      startTime: item.start_time,
      endTime: item.end_time,
      isTrans: item.is_trans,
      isSummary: item.is_summary,
      isMarkmemo: item.is_markmemo,
    })),
  });
}

async function contents(args) {
  const positional = [];
  const options = parseOptions(args, positional);
  const fileId = requireFileId(positional);
  const client = await createClient(options.env);
  const detail = await getFileDetail(client, fileId);

  printJson({
    fileId,
    name: detail.data?.file_name ?? "",
    content: extractContentLinks(detail),
  });
}

async function download(args) {
  const positional = [];
  const options = parseOptions(args, positional);
  const fileId = requireFileId(positional);
  const outputDir = resolve(options["output-dir"] ?? DEFAULT_DOWNLOAD_DIR);
  const force = Boolean(options.force);
  const client = await createClient(options.env);

  const detail = await getFileDetail(client, fileId);
  const tempUrl = await client.getJson(`/file/temp-url/${fileId}`);
  const downloadUrl = tempUrl.temp_url_opus ?? tempUrl.temp_url;
  if (!downloadUrl) {
    throw new Error(`missing Plaud audio temp URL for ${fileId}`);
  }

  const extension = extensionFromUrl(downloadUrl, "opus");
  const outputPath = join(outputDir, buildOutputFilename(detail.data?.file_name ?? fileId, fileId, extension));
  const saved = await saveUrl(downloadUrl, outputPath, { force });

  printJson({
    status: saved.status,
    fileId,
    name: detail.data?.file_name ?? "",
    path: saved.path,
    sizeBytes: saved.sizeBytes,
  });
}

async function fetchGeneratedContent(kind, args) {
  const positional = [];
  const options = parseOptions(args, positional);
  const fileId = requireFileId(positional);
  const outputDir = resolve(options["output-dir"] ?? DEFAULT_DOWNLOAD_DIR);
  const force = Boolean(options.force);
  const client = await createClient(options.env);
  const detail = await getFileDetail(client, fileId);
  const links = extractContentLinks(detail)[kind];

  if (!links?.length) {
    throw new Error(`no ready ${kind} content found for ${fileId}`);
  }

  const saved = [];
  for (let index = 0; index < links.length; index += 1) {
    const link = links[index];
    const response = await fetch(link.url);
    if (!response.ok) {
      throw new Error(`${kind} fetch failed: ${response.status} ${response.statusText}`);
    }

    const payload = Buffer.from(await response.arrayBuffer());
    const baseTitle = link.title || `${kind}-${index + 1}`;
    const outputName = buildGeneratedFilename({
      displayName: detail.data?.file_name ?? fileId,
      fileId,
      title: baseTitle,
      kind,
      index,
      url: link.url,
    });
    const outputPath = join(outputDir, outputName);

    if (existsSync(outputPath) && !force) {
      saved.push({ status: "skipped", type: link.type, title: link.title, path: outputPath });
      continue;
    }

    await mkdir(dirname(outputPath), { recursive: true });
    let text = decodeMaybeGzip(payload);
    if (kind === "transcript") {
      const segments = parseTranscriptPayload(payload);
      text = JSON.stringify({
        segmentCount: segments.length,
        text: segments.map((segment) => segment.content).filter(Boolean).join(" "),
        segments,
      }, null, 2);
    }

    await writeFile(outputPath, text);
    saved.push({
      status: "downloaded",
      type: link.type,
      title: link.title,
      path: outputPath,
      sizeBytes: Buffer.byteLength(text),
    });
  }

  printJson({ fileId, name: detail.data?.file_name ?? "", [kind]: saved });
}

function buildGeneratedFilename({ displayName, fileId, title, kind, index, url }) {
  const extension = kind === "transcript" ? "json" : normalizedGeneratedExtension(url);
  const prefix = sanitizeFilenamePrefix(displayName);
  const titlePart = sanitizeFilenamePrefix(title || `${kind}-${index + 1}`);
  return `${prefix}__${fileId}__${kind}-${index + 1}-${titlePart}.${extension}`;
}

function normalizedGeneratedExtension(url) {
  const name = basename(new URL(url).pathname);
  if (name.endsWith(".md.gz")) {
    return "md";
  }
  if (name.endsWith(".json.gz")) {
    return "json";
  }
  return extensionFromUrl(url, "txt");
}

async function getFileDetail(client, fileId) {
  return client.getJson(`/file/detail/${fileId}`);
}

async function saveUrl(url, outputPath, { force }) {
  if (existsSync(outputPath) && !force) {
    return { status: "skipped", path: outputPath, sizeBytes: null };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText}`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, bytes);
  return { status: "downloaded", path: outputPath, sizeBytes: bytes.length };
}

async function createClient(envPathOption) {
  const envPath = resolve(envPathOption ?? DEFAULT_ENV_PATH);
  if (!existsSync(envPath)) {
    throw new Error(`missing env file: ${envPath}. Run plfetch onboard first.`);
  }

  const env = parseEnvText(await Bun.file(envPath).text());
  for (const key of ["PLAUD_BASE_URL", "PLAUD_AUTHORIZATION", "PLAUD_X_DEVICE_ID", "PLAUD_X_PLD_TAG", "PLAUD_X_PLD_USER"]) {
    if (!env[key]) {
      throw new Error(`missing ${key} in ${envPath}`);
    }
  }

  const baseUrl = env.PLAUD_BASE_URL.replace(/\/$/, "");
  const headers = buildPlaudHeaders(env);

  return {
    async getJson(pathname, searchParams = {}) {
      const url = new URL(pathname, `${baseUrl}/`);
      for (const [key, value] of Object.entries(searchParams)) {
        url.searchParams.set(key, String(value));
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Plaud request failed: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json();
      assertPlaudSuccess(payload);
      return payload;
    },
  };
}

function parseOptions(args, positional = []) {
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const name = arg.slice(2);
    if (name === "force") {
      options.force = true;
      continue;
    }

    const value = args[++i];
    if (!value) {
      throw new Error(`missing value for --${name}`);
    }
    options[name] = value;
  }
  return options;
}

function requireFileId(positional) {
  const fileId = positional[0];
  if (!fileId) {
    throw new Error("fileId is required");
  }
  return fileId;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

await main(Bun.argv.slice(2));
