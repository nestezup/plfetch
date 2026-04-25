import { gzipSync } from "node:zlib";
import { describe, expect, test } from "bun:test";

import {
  buildOutputFilename,
  getDefaultPaths,
  extractContentLinks,
  parseCopiedCurl,
  parseTranscriptPayload,
} from "../src/core.js";

describe("plfetch core", () => {
test("parseCopiedCurl extracts only the Plaud credentials needed by the CLI", () => {
  const env = parseCopiedCurl(`curl 'https://api-apne1.plaud.ai/ai/file-task-status' \\
    -H 'authorization: bearer token-value' \\
    -H 'x-device-id: device-1' \\
    -H 'x-pld-tag: tag-1' \\
    -H 'x-pld-user: user-1' \\
    -H 'sec-fetch-site: same-site'`);

  expect(env).toEqual({
    PLAUD_BASE_URL: "https://api-apne1.plaud.ai",
    PLAUD_AUTHORIZATION: "bearer token-value",
    PLAUD_X_DEVICE_ID: "device-1",
    PLAUD_X_PLD_TAG: "tag-1",
    PLAUD_X_PLD_USER: "user-1",
    PLAUD_APP_LANGUAGE: "en",
    PLAUD_APP_PLATFORM: "web",
    PLAUD_EDIT_FROM: "web",
    PLAUD_ORIGIN: "https://web.plaud.ai",
    PLAUD_REFERER: "https://web.plaud.ai/",
    PLAUD_TIMEZONE: "Asia/Seoul",
  });
});

test("extractContentLinks groups Plaud detail content links by usable content type", () => {
  const links = extractContentLinks({
    data: {
      content_list: [
        { data_type: "transaction", task_status: 1, data_link: "https://s3/trans_result.json.gz" },
        { data_type: "auto_sum_note", task_status: 1, data_link: "https://s3/summary-0.json.gz" },
        { data_type: "sum_multi_note", task_status: 1, data_link: "https://s3/summary-1.json.gz" },
        { data_type: "high_light", task_status: 0, data_link: "https://s3/not-ready" },
        { data_type: "outline", task_status: 1, data_link: "" },
      ],
    },
  });

  expect(links).toEqual({
    transcript: [
      { type: "transaction", title: "", url: "https://s3/trans_result.json.gz" },
    ],
    summary: [
      { type: "auto_sum_note", title: "", url: "https://s3/summary-0.json.gz" },
      { type: "sum_multi_note", title: "", url: "https://s3/summary-1.json.gz" },
    ],
    outline: [],
    highlight: [],
    markMemo: [],
    all: [
      { type: "transaction", title: "", url: "https://s3/trans_result.json.gz" },
      { type: "auto_sum_note", title: "", url: "https://s3/summary-0.json.gz" },
      { type: "sum_multi_note", title: "", url: "https://s3/summary-1.json.gz" },
    ],
  });
});

test("parseTranscriptPayload accepts gzip transcript arrays", () => {
  const segments = [
    { content: "hello", start_time: 1, end_time: 2 },
    { content: "world", start_time: 3, end_time: 4 },
  ];
  const parsed = parseTranscriptPayload(gzipSync(Buffer.from(JSON.stringify(segments))));

  expect(parsed).toEqual(segments);
});

test("buildOutputFilename prefixes saved files with the Plaud display name", () => {
  expect(
    buildOutputFilename("04-23 강의: AI 에이전트", "file-123", "ogg"),
  ).toBe("04-23 강의_ AI 에이전트__file-123.ogg");
});

test("getDefaultPaths follows common macOS and Linux CLI locations", () => {
  expect(getDefaultPaths("/Users/alice")).toEqual({
    envPath: "/Users/alice/.config/plfetch/.env",
    downloadDir: "/Users/alice/Downloads/plfetch",
  });
});
});
