import type {
  DashboardData,
  DeviceConfigurations,
  DayHistory,
  MachineListItem,
  MachineStatus,
} from "@/src/types/dashboard";

import { createLogger } from "@/src/lib/logging";
import { getServerConfig } from "./config";

interface TokenResponse {
  jwtToken: string;
  refreshToken: string;
}

interface ProjectTopicSnapshot {
  payload?: Record<string, unknown>;
  timestamp?: string;
}

interface ProjectStateResponse {
  status: string;
  data: Record<string, Record<string, ProjectTopicSnapshot>>;
}

interface ProjectStateRequestBody {
  projectName: string;
}

interface UpdateStateDetailsResponse {
  status?: string;
  data?: {
    payload?: unknown;
    timestamp?: string;
  };
}

interface StreamDataPoint {
  payload?: unknown;
  timestamp?: string;
}

interface StreamDataResponse {
  status?: string;
  data?: StreamDataPoint[];
}

const CONFIGURATIONS_TOPIC = "configurations";
const ELAPSED_TIME_TOPIC = "elapsedtime";

function toStateDetailsTopic(channel: string | null): string {
  if (!channel) {
    throw new Error("No channel selected for dashboard state fetch.");
  }

  return `frontend/${channel}`;
}

function toProjectStateRequestPayload(config: {
  projectName: string;
}): ProjectStateRequestBody {
  return {
    projectName: config.projectName,
  };
}

function toRecentPowerWindowIso(config: {
  powerWindowStartOffsetDays: number;
  powerWindowEndOffsetDays: number;
}): { startTime: string; endTime: string } {
  const now = new Date();
  const todayStartUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0,
  );

  const oneDayMs = 24 * 60 * 60 * 1000;

  return {
    startTime: new Date(
      todayStartUtc + config.powerWindowStartOffsetDays * oneDayMs,
    ).toISOString(),
    endTime: new Date(
      todayStartUtc + config.powerWindowEndOffsetDays * oneDayMs,
    ).toISOString(),
  };
}

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
}

let tokenCache: TokenCache | null = null;
let tokenRefreshInFlight: Promise<TokenCache> | null = null;

interface ProjectStateCache {
  value: ProjectStateResponse;
  expiresAtMs: number;
}

interface InitialPowerCacheEntry {
  value: number | null;
  expiresAtMs: number;
}

let projectStateCache: ProjectStateCache | null = null;
let projectStateInFlight: Promise<ProjectStateResponse> | null = null;
const initialPowerCache = new Map<string, InitialPowerCacheEntry>();
const initialPowerInFlight = new Map<string, Promise<number | null>>();

const log = createLogger("protonest-client", "server");

const TOKEN_EXPIRY_SKEW_MS = 60_000;
const INITIAL_POWER_FETCH_TIMEOUT_MS = 1_200;
const PROJECT_STATE_CACHE_TTL_MS = 1_000;
const INITIAL_POWER_CACHE_TTL_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    void promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

function parseJwtExpiryMs(jwtToken: string): number {
  try {
    const [, payload] = jwtToken.split(".");
    if (!payload) {
      return Date.now() + 5 * 60_000;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      Buffer.from(normalized, "base64").toString("utf8"),
    ) as {
      exp?: number;
    };

    if (typeof json.exp === "number") {
      return json.exp * 1000;
    }
  } catch {
    return Date.now() + 5 * 60_000;
  }

  return Date.now() + 5 * 60_000;
}

async function protonestRequest<T>(
  path: string,
  init: RequestInit,
  includeAuth = false,
): Promise<T> {
  const config = getServerConfig();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (includeAuth) {
    const session = await getServerSessionToken();
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  log.debug("protonest_request_start", {
    path,
    method: init.method ?? "GET",
    includeAuth,
  });

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }

    log.error("protonest_request_failed", {
      path,
      method: init.method ?? "GET",
      status: response.status,
      statusText: response.statusText,
      detail,
    });

    throw new Error(
      `Protonest request failed (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`,
    );
  }

  log.debug("protonest_request_success", {
    path,
    method: init.method ?? "GET",
    status: response.status,
  });

  return (await response.json()) as T;
}

async function requestFreshToken(): Promise<TokenCache> {
  const config = getServerConfig();

  log.info("token_fetch_start", {
    mode: "fresh",
    emailConfigured: Boolean(config.authEmail),
  });

  const payload = await protonestRequest<TokenResponse>(
    "/api/v1/user/get-token",
    {
      method: "POST",
      body: JSON.stringify({
        email: config.authEmail,
        password: config.authPassword,
      }),
    },
    false,
  );

  const next: TokenCache = {
    accessToken: payload.jwtToken,
    refreshToken: payload.refreshToken,
    expiresAtMs: parseJwtExpiryMs(payload.jwtToken),
  };

  tokenCache = next;
  log.info("token_fetch_success", {
    mode: "fresh",
    expiresAtMs: next.expiresAtMs,
  });
  return next;
}

async function requestRefreshedToken(
  refreshToken: string,
): Promise<TokenCache> {
  log.info("token_fetch_start", {
    mode: "refresh",
    hasRefreshToken: Boolean(refreshToken),
  });

  let payload: TokenResponse;

  try {
    payload = await protonestRequest<TokenResponse>(
      "/api/v1/user/get-new-token",
      {
        method: "GET",
        body: JSON.stringify({ refreshToken }),
      },
      false,
    );
  } catch {
    const query = new URLSearchParams({ refreshToken }).toString();
    payload = await protonestRequest<TokenResponse>(
      `/api/v1/user/get-new-token?${query}`,
      {
        method: "GET",
      },
      false,
    );
  }

  const next: TokenCache = {
    accessToken: payload.jwtToken,
    refreshToken: payload.refreshToken,
    expiresAtMs: parseJwtExpiryMs(payload.jwtToken),
  };

  tokenCache = next;
  log.info("token_fetch_success", {
    mode: "refresh",
    expiresAtMs: next.expiresAtMs,
  });
  return next;
}

export async function getServerSessionToken(): Promise<{
  accessToken: string;
  expiresAtMs: number;
}> {
  const now = Date.now();

  if (tokenCache && now < tokenCache.expiresAtMs - TOKEN_EXPIRY_SKEW_MS) {
    log.debug("token_cache_hit", {
      expiresAtMs: tokenCache.expiresAtMs,
    });
    return {
      accessToken: tokenCache.accessToken,
      expiresAtMs: tokenCache.expiresAtMs,
    };
  }

  if (!tokenRefreshInFlight) {
    log.debug("token_refresh_singleflight_start");
    tokenRefreshInFlight = (async () => {
      if (tokenCache?.refreshToken) {
        try {
          return await requestRefreshedToken(tokenCache.refreshToken);
        } catch (error) {
          log.warn("token_refresh_failed_fallback_fresh", {
            message:
              error instanceof Error
                ? error.message
                : "Unknown token refresh error.",
          });
          return requestFreshToken();
        }
      }

      return requestFreshToken();
    })();
  }

  try {
    const next = await tokenRefreshInFlight;
    log.debug("token_refresh_singleflight_success", {
      expiresAtMs: next.expiresAtMs,
    });
    return { accessToken: next.accessToken, expiresAtMs: next.expiresAtMs };
  } finally {
    tokenRefreshInFlight = null;
  }
}

function toIsoFromDdMmYyyy(value: string): string | null {
  const [dayRaw, monthRaw, yearRaw] = value.split("-");
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toStatus(value: unknown): MachineStatus {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 1) {
      return "RUNNING";
    }
    if (value === 0 || value === 2) {
      return "IDLE";
    }

    return "UNKNOWN";
  }

  if (typeof value !== "string") {
    return "UNKNOWN";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "running") {
    return "RUNNING";
  }
  if (normalized === "idle") {
    return "IDLE";
  }
  if (normalized === "disconnected") {
    return "DISCONNECTED";
  }

  return "UNKNOWN";
}

function parsePowerWatts(raw: unknown): number | null {
  const value =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : null;

  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.abs(value);
}

function readPowerFromStreamPayload(payload: unknown): number | null {
  let parsed: unknown = payload;

  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const source = parsed as Record<string, unknown>;
  const nested =
    source.payload && typeof source.payload === "object"
      ? (source.payload as Record<string, unknown>)
      : null;

  return parsePowerWatts(nested?.act_power ?? source.act_power);
}

async function fetchInitialPowerWatts(
  machineId: string,
  channel: string | null,
): Promise<number | null> {
  if (!channel) {
    return null;
  }

  const cacheKey = `${machineId}::${channel}`;
  const now = Date.now();
  const cached = initialPowerCache.get(cacheKey);
  if (cached && now < cached.expiresAtMs) {
    return cached.value;
  }

  const inFlight = initialPowerInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const config = getServerConfig();
    const { startTime, endTime } = toRecentPowerWindowIso({
      powerWindowStartOffsetDays: config.powerWindowStartOffsetDays,
      powerWindowEndOffsetDays: config.powerWindowEndOffsetDays,
    });

    const response = await protonestRequest<StreamDataResponse>(
      "/api/v1/user/get-stream-data/device/topic",
      {
        method: "POST",
        body: JSON.stringify({
          deviceId: machineId,
          topic: `status/${channel}`,
          startTime,
          endTime,
          pagination: "0",
          pageSize: "1",
        }),
      },
      true,
    );

    const first = response.data?.[0];
    const value = first ? readPowerFromStreamPayload(first.payload) : null;

    initialPowerCache.set(cacheKey, {
      value,
      expiresAtMs: Date.now() + INITIAL_POWER_CACHE_TTL_MS,
    });

    return value;
  })();

  initialPowerInFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    initialPowerInFlight.delete(cacheKey);
  }
}

function toChannelFromTopicKey(topic: string): string | null {
  const normalized = topic.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("frontend/")) {
    const channel = normalized.slice("frontend/".length).trim();
    return channel || null;
  }

  if (/^em\d+:\d+$/i.test(normalized)) {
    return normalized;
  }

  return null;
}

export async function fetchProjectMachineList(): Promise<MachineListItem[]> {
  const config = getServerConfig();

  try {
    const projectState = await fetchProjectState();

    const machines = Object.entries(projectState.data ?? {}).map(([deviceId, topics]) => {
      const channels = new Set<string>();
      let status: MachineStatus = "UNKNOWN";

      for (const [topicName, snapshot] of Object.entries(topics ?? {})) {
        const channel = toChannelFromTopicKey(topicName);
        if (channel) {
          channels.add(channel);
        }

        if (!topicName.startsWith("frontend/")) {
          continue;
        }

        const payload = snapshot.payload;
        if (status === "UNKNOWN" && payload) {
          status = toStatus(payload.status);
        }
      }

      const channelList = [...channels].sort((a, b) => a.localeCompare(b));
      return {
        id: deviceId,
        name: deviceId,
        status,
        channels: channelList,
      } satisfies MachineListItem;
    });

    const machinesWithChannels = machines.filter((machine) => machine.channels.length > 0);
    if (machinesWithChannels.length > 0) {
      const firstMachine = machinesWithChannels[0];
      const firstChannel = firstMachine?.channels[0] ?? null;

      if (firstMachine && firstChannel) {
        void fetchInitialPowerWatts(firstMachine.id, firstChannel).catch(() => null);
      }

      return machinesWithChannels;
    }

    log.warn("machines_project_empty", {
      projectName: config.projectName,
    });
    return [];
  } catch (error) {
    log.warn("machines_project_fetch_failed", {
      projectName: config.projectName,
      message: error instanceof Error ? error.message : "Unknown project fetch error.",
    });
    throw error;
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
}

function toPercent(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return null;
  }

  if (numeric <= 1) {
    return numeric * 100;
  }

  return numeric;
}

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return Math.max(0, numeric);
    }
  }

  return null;
}

function readNonNegativeNumberFromKeys(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    if (!(key in source)) {
      continue;
    }

    const next = toNonNegativeNumber(source[key]);
    if (next !== null) {
      return next;
    }
  }

  return null;
}

function readPercentFromKeys(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    if (!(key in source)) {
      continue;
    }

    const candidate = source[key];
    const normalized =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string"
          ? Number(candidate)
          : null;

    if (normalized === null || !Number.isFinite(normalized)) {
      continue;
    }

    const next = toPercent(normalized);
    if (next !== null) {
      return next;
    }
  }

  return null;
}

function readConfigurationsFromEnvelope(payload: unknown): DeviceConfigurations {
  const empty: DeviceConfigurations = {
    channel1Hours: 0,
    channel2Hours: 0,
    channel1Threshold: 0,
    channel2Threshold: 0,
  };

  if (!payload || typeof payload !== "object") {
    return empty;
  }

  const first = payload as Record<string, unknown>;
  const nested =
    first.payload && typeof first.payload === "object"
      ? (first.payload as Record<string, unknown>)
      : null;
  const source = nested ?? first;

  return {
    channel1Hours:
      readNonNegativeNumberFromKeys(source, [
        "channel1hours",
        "Channel1hours",
        "channel1Hours",
        "Channel1Hours",
      ]) ?? 0,
    channel2Hours:
      readNonNegativeNumberFromKeys(source, [
        "channel2hours",
        "Channel2hours",
        "channel2Hours",
        "Channel2Hours",
      ]) ?? 0,
    channel1Threshold:
      readNonNegativeNumberFromKeys(source, [
        "channel1threshold",
        "Channel1threshold",
        "channel1Threshold",
        "Channel1Threshold",
      ]) ?? 0,
    channel2Threshold:
      readNonNegativeNumberFromKeys(source, [
        "channel2threshold",
        "Channel2threshold",
        "channel2Threshold",
        "Channel2Threshold",
      ]) ?? 0,
  };
}

function toHistory(payload: Record<string, unknown>): DayHistory[] {
  const rows: DayHistory[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (
      key === "status" ||
      key.endsWith("_utl") ||
      key.endsWith("_elapsedhr")
    ) {
      continue;
    }

    const isoDate = toIsoFromDdMmYyyy(key);
    if (!isoDate) {
      continue;
    }

    const runtimeHours = toFiniteNumber(value);
    const utilizationPct = toPercent(payload[`${key}_utl`]);
    const elapsedHours = toNonNegativeNumber(payload[`${key}_elapsedhr`]) ?? 0;

    rows.push({
      date: isoDate,
      runtimeHours,
      elapsedHours,
      utilizationPct,
    });
  }

  return rows.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

async function fetchProjectState(): Promise<ProjectStateResponse> {
  const now = Date.now();
  if (projectStateCache && now < projectStateCache.expiresAtMs) {
    return projectStateCache.value;
  }

  if (!projectStateInFlight) {
    projectStateInFlight = (async () => {
      const config = getServerConfig();
      const value = await protonestRequest<ProjectStateResponse>(
        "/api/v1/user/get-state-details/project",
        {
          method: "POST",
          body: JSON.stringify(toProjectStateRequestPayload(config)),
        },
        true,
      );

      projectStateCache = {
        value,
        expiresAtMs: Date.now() + PROJECT_STATE_CACHE_TTL_MS,
      };

      return value;
    })();
  }

  try {
    return await projectStateInFlight;
  } finally {
    projectStateInFlight = null;
  }
}

function getMachineTopicSnapshot(
  topics: Record<string, ProjectTopicSnapshot>,
  topicCandidates: string[],
): ProjectTopicSnapshot | null {
  for (const topicCandidate of topicCandidates) {
    const exact = topics[topicCandidate];
    if (exact) {
      return exact;
    }
  }

  return null;
}

export async function updateElapsedTimeHours(
  machineId: string,
  hours: number,
): Promise<void> {
  if (!Number.isFinite(hours)) {
    throw new Error("Elapsed hours must be a finite number.");
  }

  await protonestRequest(
    "/api/v1/user/update-state-details",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: machineId,
        topic: ELAPSED_TIME_TOPIC,
        payload: {
          hours: String(Math.max(0, hours)),
        },
      }),
    },
    true,
  );
}

export async function updateDeviceConfigurations(
  machineId: string,
  configurations: DeviceConfigurations,
): Promise<DeviceConfigurations> {
  const {
    channel1Hours,
    channel2Hours,
    channel1Threshold,
    channel2Threshold,
  } = configurations;

  const values: Array<[string, number]> = [
    ["channel1Hours", channel1Hours],
    ["channel2Hours", channel2Hours],
    ["channel1Threshold", channel1Threshold],
    ["channel2Threshold", channel2Threshold],
  ];

  for (const [field, value] of values) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${field} must be a non-negative finite number.`);
    }
  }

  const response = await protonestRequest<UpdateStateDetailsResponse>(
    "/api/v1/user/update-state-details",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: machineId,
        topic: CONFIGURATIONS_TOPIC,
        payload: {
          channel1hours: String(channel1Hours),
          channel2hours: String(channel2Hours),
          channel1threshold: String(channel1Threshold),
          channel2threshold: String(channel2Threshold),
        },
      }),
    },
    true,
  );

  return readConfigurationsFromEnvelope(response.data?.payload);
}

export async function fetchMachineStateDashboardData(
  machineId: string,
  channel: string | null,
): Promise<DashboardData> {
  log.info("dashboard_fetch_start", {
    machineId,
  });

  const config = getServerConfig();
  const machineName = machineId;
  const initialPowerPromise = fetchInitialPowerWatts(machineId, channel);

  let topics: Record<string, ProjectTopicSnapshot>;
  const stateTopic = toStateDetailsTopic(channel);

  try {
    const projectState = await fetchProjectState();
    topics = projectState.data?.[machineId] ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("401") || message.includes("403")) {
      log.warn("dashboard_fetch_auth_retry", {
        machineId,
        message,
      });
      tokenCache = null;
      await getServerSessionToken();
      const projectState = await fetchProjectState();
      topics = projectState.data?.[machineId] ?? {};
    } else {
      log.error("dashboard_fetch_failed", {
        machineId,
        message,
      });
      throw error;
    }
  }

  if (Object.keys(topics).length === 0) {
    throw new Error(`No project state found for machine '${machineId}'.`);
  }

  const stateSnapshot = getMachineTopicSnapshot(topics, [stateTopic]);
  const configurationsSnapshot = getMachineTopicSnapshot(topics, [CONFIGURATIONS_TOPIC]);

  if (!stateSnapshot) {
    throw new Error(
      `No state topic '${stateTopic}' found for machine '${machineId}' in project state response.`,
    );
  }

  const payload = stateSnapshot.payload ?? {};
  const currentElapsedHours =
    readNonNegativeNumberFromKeys(payload, ["today_elapsedhr", "todayElapsedhr", "todayElapsedHr"]) ??
    0;
  const parsedConfigurations = readConfigurationsFromEnvelope(configurationsSnapshot?.payload);

  const thisWeekRuntime = toFiniteNumber(payload.thisweek);
  const thisMonthRuntime = toFiniteNumber(payload.thismonth);
  const thisWeekUtilization = readPercentFromKeys(payload, [
    "thisweek_utl",
    "thisWeek_utl",
    "thisWeekUtl",
  ]);
  const thisMonthUtilization = readPercentFromKeys(payload, [
    "thismonth_utl",
    "thisMonth_utl",
    "thisMonthUtl",
  ]);
  const weekHighutil = readPercentFromKeys(payload, ["weekHighutil", "weekHighUtil"]);
  const monthHighutil = readPercentFromKeys(payload, ["monthHighutil", "monthHighUtil"]);
  const timestamp = stateSnapshot.timestamp ?? new Date().toISOString();
  const history7d = toHistory(payload);
  const latestDay = history7d.at(-1);
  const todayRuntime = latestDay?.runtimeHours ?? null;
  const todayUtilization = latestDay?.utilizationPct ?? null;
  const thisWeekElapsed =
    readNonNegativeNumberFromKeys(payload, [
      "thisWeek_elapsedhr",
      "thisweek_elapsedhr",
      "thisWeekElapsedhr",
      "thisWeekElapsedHr",
    ]) ?? 0;
  const thisMonthElapsed =
    readNonNegativeNumberFromKeys(payload, [
      "thisMonth_elapsedhr",
      "thismonth_elapsedhr",
      "thisMonthElapsedhr",
      "thisMonthElapsedHr",
    ]) ?? 0;

  const initialPowerWatts = await withTimeout(
    initialPowerPromise,
    INITIAL_POWER_FETCH_TIMEOUT_MS,
  );

  if (initialPowerWatts === null) {
    log.warn("dashboard_initial_power_fetch_fallback", {
      machineId,
      channel,
      timeoutMs: INITIAL_POWER_FETCH_TIMEOUT_MS,
    });
  }

  log.info("dashboard_fetch_success", {
    machineId,
    pointCount: history7d.length,
    hasThisWeek: thisWeekRuntime !== null,
    hasThisMonth: thisMonthRuntime !== null,
  });

  return {
    machine: {
      id: machineId,
      name: machineName,
      status: toStatus(payload.status),
      powerWatts: initialPowerWatts,
      lastUpdated: timestamp,
    },
    configurations: parsedConfigurations,
    periods: {
      today: {
        runtimeHours: todayRuntime,
        elapsedHours: currentElapsedHours,
        utilizationPct: todayUtilization,
        highestScorePct: null,
      },
      week: {
        runtimeHours: thisWeekRuntime,
        elapsedHours: thisWeekElapsed,
        utilizationPct: thisWeekUtilization,
        highestScorePct: weekHighutil,
      },
      month: {
        runtimeHours: thisMonthRuntime,
        elapsedHours: thisMonthElapsed,
        utilizationPct: thisMonthUtilization,
        highestScorePct: monthHighutil,
      },
    },
    history7d,
    sheet: config.googleSheetUrl
      ? {
          mode: "link",
          url: config.googleSheetUrl,
        }
      : null,
    baseline: null,
  };
}
