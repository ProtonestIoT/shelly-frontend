export interface ProtonestServerConfig {
  apiBaseUrl: string;
  authEmail: string;
  authPassword: string;
  projectName: string;
  googleSheetUrl: string | null;
  powerWindowStartOffsetDays: number;
  powerWindowEndOffsetDays: number;
}

const DEFAULT_POWER_WINDOW_START_OFFSET_DAYS = -1;
const DEFAULT_POWER_WINDOW_END_OFFSET_DAYS = 1;

function readInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function getServerConfig(): ProtonestServerConfig {
  const apiBaseUrl = process.env.PROTONEST_API_BASE_URL?.trim();
  const authEmail = process.env.PROTONEST_AUTH_EMAIL?.trim();
  const authPassword = process.env.PROTONEST_AUTH_PASSWORD?.trim();
  const projectName = process.env.PROTONEST_PROJECT_NAME?.trim();
  const googleSheetUrl = process.env.PROTONEST_GOOGLE_SHEET_URL?.trim() || null;
  const powerWindowStartOffsetDays = readInteger(
    process.env.PROTONEST_POWER_WINDOW_START_OFFSET_DAYS,
    DEFAULT_POWER_WINDOW_START_OFFSET_DAYS,
  );
  const powerWindowEndOffsetDays = readInteger(
    process.env.PROTONEST_POWER_WINDOW_END_OFFSET_DAYS,
    DEFAULT_POWER_WINDOW_END_OFFSET_DAYS,
  );

  if (!apiBaseUrl) {
    throw new Error("PROTONEST_API_BASE_URL is not configured.");
  }

  if (!authEmail || !authPassword) {
    throw new Error(
      "PROTONEST_AUTH_EMAIL and PROTONEST_AUTH_PASSWORD must be configured.",
    );
  }

  if (!projectName) {
    throw new Error("PROTONEST_PROJECT_NAME is not configured.");
  }

  return {
    apiBaseUrl,
    authEmail,
    authPassword,
    projectName,
    googleSheetUrl,
    powerWindowStartOffsetDays,
    powerWindowEndOffsetDays,
  };
}

export interface ProtonestPublicConfig {
  wsEnabled: boolean;
  wsUrl: string | null;
  stateTopicPrefix: string | null;
  streamTopicPrefix: string | null;
}

const DEFAULT_WS_HOST = "api.protonestconnect.co";
const DEFAULT_STATE_TOPIC_PREFIX = "/topic/state";
const DEFAULT_STREAM_TOPIC_PREFIX = "/topic/stream";

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}

function ensureLeadingSlash(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeWsUrl(value: string | undefined): string {
  const raw = value?.trim() || DEFAULT_WS_HOST;

  if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
    return raw;
  }

  const withoutHttp = raw.replace(/^https?:\/\//i, "");
  if (withoutHttp.includes("/")) {
    return `wss://${withoutHttp}`;
  }

  return `wss://${withoutHttp}/ws`;
}

export function getPublicConfig(): ProtonestPublicConfig {
  const wsEnabled = readBoolean(process.env.NEXT_PUBLIC_PROTONEST_WS_ENABLED, true);
  const wsUrl = normalizeWsUrl(process.env.NEXT_PUBLIC_PROTONEST_WS_URL);
  const stateTopicPrefix = ensureLeadingSlash(
    process.env.NEXT_PUBLIC_PROTONEST_STATE_TOPIC_PREFIX ?? DEFAULT_STATE_TOPIC_PREFIX,
  );
  const streamTopicPrefix = ensureLeadingSlash(
    process.env.NEXT_PUBLIC_PROTONEST_STREAM_TOPIC_PREFIX ?? DEFAULT_STREAM_TOPIC_PREFIX,
  );

  if (!wsEnabled) {
    return {
      wsEnabled,
      wsUrl: null,
      stateTopicPrefix: null,
      streamTopicPrefix: null,
    };
  }

  return {
    wsEnabled,
    wsUrl,
    stateTopicPrefix,
    streamTopicPrefix,
  };
}
