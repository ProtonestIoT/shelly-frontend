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

interface StateResponse {
  status: string;
  data: {
    payload: Record<string, unknown>;
    timestamp?: string;
  };
}

interface ElapsedPayload {
  hours?: string | number;
  payload?: {
    hours?: string | number;
  };
}

interface ProjectTopicSnapshot {
  payload?: Record<string, unknown>;
  timestamp?: string;
}

interface ProjectStateResponse {
  status: string;
  data: Record<string, Record<string, ProjectTopicSnapshot>>;
}

const CONFIGURATIONS_TOPIC = "configurations";
const ELAPSED_TIME_TOPIC = "elapsedtime";

function toStateDetailsTopic(channel: string | null): string {
  if (!channel) {
    throw new Error("No channel selected for dashboard state fetch.");
  }

  return `frontend/${channel}`;
}

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
}

let tokenCache: TokenCache | null = null;
let tokenRefreshInFlight: Promise<TokenCache> | null = null;

const log = createLogger("protonest-client", "server");

const TOKEN_EXPIRY_SKEW_MS = 60_000;

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
    const projectState = await protonestRequest<ProjectStateResponse>(
      "/api/v1/user/get-state-details/project",
      {
        method: "POST",
        body: JSON.stringify({
          projectId: config.projectId,
        }),
      },
      true,
    );

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
      return machinesWithChannels;
    }

    log.warn("machines_project_empty", {
      projectId: config.projectId,
    });
    return [];
  } catch (error) {
    log.warn("machines_project_fetch_failed", {
      projectId: config.projectId,
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

  if (numeric <= 100) {
    return numeric;
  }

  return null;
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

function readElapsedHoursFromEnvelope(payload: unknown): number {
  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const candidate = payload as ElapsedPayload;
  return toNonNegativeNumber(candidate.hours ?? candidate.payload?.hours) ?? 0;
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
    channel1Hours: toNonNegativeNumber(source.channel1hours ?? source.Channel1hours) ?? 0,
    channel2Hours: toNonNegativeNumber(source.channel2hours ?? source.Channel2hours) ?? 0,
    channel1Threshold:
      toNonNegativeNumber(source.channel1threshold ?? source.Channel1threshold) ?? 0,
    channel2Threshold:
      toNonNegativeNumber(source.channel2threshold ?? source.Channel2threshold) ?? 0,
  };
}

function toHistory(payload: Record<string, unknown>): DayHistory[] {
  const rows: DayHistory[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (key === "status" || key.endsWith("_utl") || key.endsWith("_elapsed")) {
      continue;
    }

    const isoDate = toIsoFromDdMmYyyy(key);
    if (!isoDate) {
      continue;
    }

    const runtimeHours = toFiniteNumber(value);
    const utilizationPct = toPercent(payload[`${key}_utl`]);
    const elapsedHours = toNonNegativeNumber(payload[`${key}_elapsed`]) ?? 0;

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

async function loadStateDetails(
  machineId: string,
  channel: string | null,
): Promise<{ state: StateResponse; elapsed: StateResponse; configurations: StateResponse }> {
  const stateTopic = toStateDetailsTopic(channel);

  const loadElapsed = protonestRequest<StateResponse>(
    "/api/v1/user/get-state-details/device/topic",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: machineId,
        topic: ELAPSED_TIME_TOPIC,
      }),
    },
    true,
  );

  const loadConfigurations = protonestRequest<StateResponse>(
    "/api/v1/user/get-state-details/device/topic",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: machineId,
        topic: CONFIGURATIONS_TOPIC,
      }),
    },
    true,
  );

  const loadStateForTopic = (topic: string) =>
    protonestRequest<StateResponse>(
      "/api/v1/user/get-state-details/device/topic",
      {
        method: "POST",
        body: JSON.stringify({
          deviceId: machineId,
          topic,
        }),
      },
      true,
    );

  const state = await loadStateForTopic(stateTopic);

  let elapsed: StateResponse;
  let configurations: StateResponse;

  try {
    elapsed = await loadElapsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown elapsed fetch error.";
    log.warn("dashboard_elapsed_fetch_failed", {
      machineId,
      message,
    });
    elapsed = {
      status: "Error",
      data: {
        payload: {},
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    configurations = await loadConfigurations;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown configurations fetch error.";
    log.warn("dashboard_configurations_fetch_failed", {
      machineId,
      message,
    });
    configurations = {
      status: "Error",
      data: {
        payload: {},
        timestamp: new Date().toISOString(),
      },
    };
  }

  return { state, elapsed, configurations };
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
): Promise<void> {
  await protonestRequest(
    "/api/v1/user/update-state-details",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: machineId,
        topic: CONFIGURATIONS_TOPIC,
        payload: {
          Channel1hours: String(configurations.channel1Hours),
          Channel2hours: String(configurations.channel2Hours),
          Channel1threshold: String(configurations.channel1Threshold),
          Channel2threshold: String(configurations.channel2Threshold),
        },
      }),
    },
    true,
  );
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

  let stateResponse: StateResponse;
  let elapsedResponse: StateResponse;
  let configurationsResponse: StateResponse;

  try {
    const response = await loadStateDetails(machineId, channel);
    stateResponse = response.state;
    elapsedResponse = response.elapsed;
    configurationsResponse = response.configurations;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("401") || message.includes("403")) {
      log.warn("dashboard_fetch_auth_retry", {
        machineId,
        message,
      });
      tokenCache = null;
      await getServerSessionToken();
      const response = await loadStateDetails(machineId, channel);
      stateResponse = response.state;
      elapsedResponse = response.elapsed;
      configurationsResponse = response.configurations;
    } else {
      log.error("dashboard_fetch_failed", {
        machineId,
        message,
      });
      throw error;
    }
  }

  const payload = stateResponse.data?.payload ?? {};
  const currentElapsedHours = readElapsedHoursFromEnvelope(elapsedResponse.data?.payload);
  const parsedConfigurations = readConfigurationsFromEnvelope(
    configurationsResponse.data?.payload,
  );

  const thisWeekRuntime = toFiniteNumber(payload.thisweek);
  const thisMonthRuntime = toFiniteNumber(payload.thismonth);
  const thisWeekUtilization = toPercent(payload.thisweek_utl);
  const thisMonthUtilization = toPercent(payload.thismonth_utl);
  const weekHighutil = toPercent(payload.weekHighutil);
  const monthHighutil = toPercent(payload.monthHighutil);
  const timestamp = stateResponse.data?.timestamp ?? new Date().toISOString();
  const history7d = toHistory(payload);
  const latestDay = history7d.at(-1);
  const todayRuntime = latestDay?.runtimeHours ?? null;
  const todayUtilization = latestDay?.utilizationPct ?? null;
  const thisWeekElapsed = toNonNegativeNumber(payload.thisweek_elapsed) ?? 0;
  const thisMonthElapsed = toNonNegativeNumber(payload.thismonth_elapsed) ?? 0;

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
      powerWatts: null,
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
