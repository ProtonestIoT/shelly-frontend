import type { DashboardData, DayHistory, MachineStatus } from "@/src/types/dashboard";

import { createLogger } from "@/src/lib/logging";
import { getServerConfig } from "./config";

interface TokenResponse {
  jwtToken: string;
  refreshToken: string;
}

interface StateResponse {
  status: string;
  data: {
    payload: Record<string, number>;
    timestamp?: string;
  };
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
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as {
      exp?: number;
    };

    if (typeof json.exp === "number") {
      return json.exp * 1000;
    }
  } catch {
    // Ignore and fallback to short-lived value.
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

async function requestRefreshedToken(refreshToken: string): Promise<TokenCache> {
  log.info("token_fetch_start", {
    mode: "refresh",
    hasRefreshToken: Boolean(refreshToken),
  });

  const payload = await protonestRequest<TokenResponse>(
    "/api/v1/user/get-new-token",
    {
      method: "GET",
      body: JSON.stringify({ refreshToken }),
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
    return { accessToken: tokenCache.accessToken, expiresAtMs: tokenCache.expiresAtMs };
  }

  if (!tokenRefreshInFlight) {
    log.debug("token_refresh_singleflight_start");
    tokenRefreshInFlight = (async () => {
      if (tokenCache?.refreshToken) {
        try {
          return await requestRefreshedToken(tokenCache.refreshToken);
        } catch (error) {
          log.warn("token_refresh_failed_fallback_fresh", {
            message: error instanceof Error ? error.message : "Unknown token refresh error.",
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

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toStatus(): MachineStatus {
  // TODO: Map machine RUNNING/IDLE/DISCONNECTED from a dedicated status topic once available.
  // Current `frontend/totalworktime` payload does not include machine execution state.
  return "UNKNOWN";
}

function toHistory(payload: Record<string, number>): DayHistory[] {
  const rows: DayHistory[] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (key === "thisweek" || key === "thismonth") {
      continue;
    }

    const isoDate = toIsoFromDdMmYyyy(key);
    if (!isoDate) {
      continue;
    }

    rows.push({
      date: isoDate,
      // TODO: Confirm unit for `frontend/totalworktime` payload from Protonest docs (hours vs minutes).
      runtimeMin: Number.isFinite(value) ? Math.max(0, value * 60) : null,
      // TODO: Elapsed time is not exposed by the current API list.
      elapsedMin: null,
      // TODO: Occupancy percentage requires elapsed/plan denominator API.
      occupancyPct: null,
    });
  }

  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function fetchMachineStateDashboardData(machineId: string): Promise<DashboardData> {
  log.info("dashboard_fetch_start", {
    machineId,
  });

  const config = getServerConfig();
  const machine = config.machineCatalog.find((entry) => entry.id === machineId);

  if (!machine) {
    log.warn("dashboard_fetch_unknown_machine", {
      machineId,
    });
    throw new Error("Unknown machine id.");
  }

  const body = {
    deviceId: machine.id,
    topic: config.totalWorktimeTopic,
  };

  const loadState = async () => {
    return protonestRequest<StateResponse>(
      "/api/v1/user/get-state-details/device/topic",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      true,
    );
  };

  let state: StateResponse;

  try {
    state = await loadState();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("401") || message.includes("403")) {
      log.warn("dashboard_fetch_auth_retry", {
        machineId,
        message,
      });
      tokenCache = null;
      await getServerSessionToken();
      state = await loadState();
    } else {
      log.error("dashboard_fetch_failed", {
        machineId,
        message,
      });
      throw error;
    }
  }

  const payload = state.data?.payload ?? {};
  const thisWeek = payload.thisweek;
  const thisMonth = payload.thismonth;
  const timestamp = state.data?.timestamp ?? new Date().toISOString();
  const history7d = toHistory(payload);
  const todayRuntime = history7d.at(-1)?.runtimeMin ?? null;

  log.info("dashboard_fetch_success", {
    machineId,
    pointCount: history7d.length,
    hasThisWeek: typeof thisWeek === "number",
    hasThisMonth: typeof thisMonth === "number",
  });

  return {
    machine: {
      id: machine.id,
      name: machine.name,
      state: toStatus(),
      // TODO: Power watts are not available from the current API list; wire dedicated topic.
      powerWatts: null,
      lastUpdated: timestamp,
    },
    periods: {
      today: {
        runtimeMin: todayRuntime,
        // TODO: Elapsed time is not exposed by the current API list.
        elapsedMin: null,
        // TODO: Occupancy percentage requires elapsed/plan denominator API.
        occupancyPct: null,
        // TODO: Best score metric source is not exposed in current API list.
        highestScorePct: null,
      },
      week: {
        // TODO: Confirm unit for `thisweek` in Protonest payload.
        runtimeMin: Number.isFinite(thisWeek) ? Math.max(0, thisWeek * 60) : null,
        elapsedMin: null,
        occupancyPct: null,
        highestScorePct: null,
      },
      month: {
        // TODO: Confirm unit for `thismonth` in Protonest payload.
        runtimeMin: Number.isFinite(thisMonth) ? Math.max(0, thisMonth * 60) : null,
        elapsedMin: null,
        occupancyPct: null,
        highestScorePct: null,
      },
    },
    history7d,
    // TODO: Sheet URL source is not exposed by the current API list.
    sheet: null,
    // TODO: Weekly baseline source is not exposed by the current API list.
    baseline: null,
  };
}
