import type {
  DashboardData,
  MachineListItem,
  MachineStatus,
} from "@/src/types/dashboard";
import { Client, type IFrame, type IMessage } from "@stomp/stompjs";
import { createLogger } from "@/src/lib/logging";

export type {
  DashboardData,
  DashboardMachine,
  DashboardPeriods,
  DayHistory,
  MachineListItem,
  MachineStatus,
  PeriodMetrics,
} from "@/src/types/dashboard";

interface WsAuthResponse {
  accessToken: string;
  expiresAtMs: number;
}

interface MachineListResponse {
  machines: MachineListItem[];
}

interface DashboardResponse {
  data: DashboardData;
}

interface ElapsedUpdateResponse {
  ok: boolean;
}

interface ConfigurationsUpdateResponse {
  ok: boolean;
}

export interface DeviceConfigurationsPayload {
  channel1Hours: number;
  channel2Hours: number;
  channel1Threshold: number;
  channel2Threshold: number;
}

export interface RealtimeStateSnapshot {
  status: MachineStatus | null;
  timestamp: string | null;
  payload: Record<string, unknown> | null;
  topic: string | null;
}

interface RealtimeConnectionOptions {
  machineId: string;
  channelId: string | null;
  stateChannelIds: string[];
  onStateTopicMessage: (next: RealtimeStateSnapshot) => void;
  onPowerUpdate: (powerWatts: number | null) => void;
  onError: (message: string) => void;
}

interface PublicRealtimeConfig {
  wsEnabled: boolean;
  wsUrl: string | null;
  stateTopicPrefix: string | null;
  streamTopicPrefix: string | null;
  stateTopicFallback: string | null;
  streamPowerTopic: string | null;
}

interface WsConfigResponse {
  config: PublicRealtimeConfig;
}

const log = createLogger("dashboard-api", "client");

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }

    log.error("client_request_failed", {
      status: response.status,
      statusText: response.statusText,
      detail,
    });

    throw new Error(
      `Request failed (${response.status} ${response.statusText})${
        detail ? `: ${detail}` : ""
      }`,
    );
  }

  log.debug("client_request_success", {
    status: response.status,
  });

  return (await response.json()) as T;
}

async function fetchWsAuthToken(): Promise<WsAuthResponse> {
  const response = await fetch("/api/protonest/ws-auth", {
    method: "GET",
    headers: jsonHeaders(),
    cache: "no-store",
  });

  return parseJsonResponse<WsAuthResponse>(response);
}

async function fetchRealtimeConfig(): Promise<PublicRealtimeConfig> {
  const response = await fetch("/api/protonest/ws-config", {
    method: "GET",
    headers: jsonHeaders(),
    cache: "no-store",
  });

  const payload = await parseJsonResponse<WsConfigResponse>(response);
  return payload.config;
}

function readMessageTopic(body: string): string | null {
  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const topicCandidates = [
      payload.topic,
      payload.mqttTopic,
      payload.topicName,
      payload.suffix,
      payload.key,
      payload.name,
    ];

    for (const candidate of topicCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  } catch {
    return null;
  }
}

function messageMatchesTopic(body: string, expectedTopic: string): boolean {
  const topic = readMessageTopic(body);
  if (!topic) {
    return false;
  }

  return topic.toLowerCase() === expectedTopic.trim().toLowerCase();
}

function messageMatchesAnyTopic(body: string, expectedTopics: string[]): boolean {
  const topic = readMessageTopic(body);
  if (!topic) {
    return true;
  }

  return expectedTopics.some((topic) => messageMatchesTopic(body, topic));
}

function readPowerWatts(body: string): number | null {
  try {
    const payload = JSON.parse(body) as {
      act_power?: unknown;
      payload?: {
        act_power?: unknown;
      };
    };

    const actPowerCandidate = payload.payload?.act_power ?? payload.act_power;
    const actPower =
      typeof actPowerCandidate === "number"
        ? actPowerCandidate
        : typeof actPowerCandidate === "string"
          ? Number(actPowerCandidate)
          : null;

    if (typeof actPower === "number" && Number.isFinite(actPower)) {
      return Math.abs(actPower);
    }
  } catch {
    return null;
  }

  return null;
}

function toMachineStatus(value: unknown): MachineStatus | null {
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
    return null;
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

function readStateMessage(body: string): RealtimeStateSnapshot {
  try {
    const payload = JSON.parse(body) as {
      payload?: Record<string, unknown>;
      timestamp?: unknown;
      topic?: unknown;
    };

    const rawPayload = payload.payload;
    const statusValue =
      rawPayload && typeof rawPayload === "object" ? rawPayload.status : undefined;

    return {
      status: toMachineStatus(statusValue),
      timestamp:
        typeof payload.timestamp === "string" && payload.timestamp.trim()
          ? payload.timestamp
          : null,
      payload:
        rawPayload && typeof rawPayload === "object" ? rawPayload : null,
      topic:
        typeof payload.topic === "string" && payload.topic.trim()
          ? payload.topic.trim()
          : null,
    };
  } catch {
    return {
      status: null,
      timestamp: null,
      payload: null,
      topic: null,
    };
  }
}

function buildExpectedTopics(channelTopic: string | null, fallbackTopic: string | null): string[] {
  const topicSet = new Set<string>();

  if (channelTopic) {
    topicSet.add(channelTopic.trim().toLowerCase());
  }
  if (fallbackTopic) {
    topicSet.add(fallbackTopic.trim().toLowerCase());
  }

  return [...topicSet];
}

function buildBrokerUrlWithToken(wsUrl: string, accessToken: string): string {
  const separator = wsUrl.includes("?") ? "&" : "?";
  return `${wsUrl}${separator}token=${encodeURIComponent(accessToken)}`;
}

export function connectRealtimeMachineUpdates({
  machineId,
  channelId,
  stateChannelIds,
  onStateTopicMessage,
  onPowerUpdate,
  onError,
}: RealtimeConnectionOptions): () => void {
  let client: Client | null = null;
  let reconnectTimer: number | null = null;
  let isDisposed = false;
  let setupAttempt = 0;

  const openConnection = async () => {
    if (isDisposed) {
      return;
    }

    try {
      log.info("ws_connect_start", {
        machineId,
        attempt: setupAttempt,
      });

      const config = await fetchRealtimeConfig();
      if (!config.wsEnabled) {
        log.info("ws_disabled_by_config", {
          machineId,
        });
        return;
      }

      if (
        !config.wsUrl ||
        !config.stateTopicPrefix ||
        !config.streamTopicPrefix
      ) {
        throw new Error("Realtime websocket config is incomplete.");
      }

      const wsBaseUrl = config.wsUrl;
      client = new Client({
        brokerURL: wsBaseUrl,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        beforeConnect: async () => {
          if (!client || isDisposed) {
            return;
          }

          const auth = await fetchWsAuthToken();
          client.brokerURL = buildBrokerUrlWithToken(wsBaseUrl, auth.accessToken);
          log.debug("ws_auth_token_refreshed", {
            machineId,
            expiresAtMs: auth.expiresAtMs,
          });
        },
        debug: (message: string) => {
          log.debug("ws_debug", { machineId, message });
        },
        onConnect: () => {
          setupAttempt = 0;
          const stateTopics = [
            ...new Set([
              ...stateChannelIds.map((stateChannel) => `frontend/${stateChannel}`.toLowerCase()),
              ...buildExpectedTopics(
                channelId ? `frontend/${channelId}` : null,
                config.stateTopicFallback,
              ),
            ]),
          ];
          const streamTopics = buildExpectedTopics(
            channelId ? `status/${channelId}` : null,
            config.streamPowerTopic,
          );

          if (stateTopics.length === 0 || streamTopics.length === 0) {
            onError("Realtime websocket config is incomplete.");
            return;
          }
          log.info("ws_connected_subscribing", {
            machineId,
          });

          client?.subscribe(`${config.stateTopicPrefix}/${machineId}`, (message: IMessage) => {
            if (messageMatchesAnyTopic(message.body, stateTopics)) {
              const receivedTopic = readMessageTopic(message.body);
              const nextState = readStateMessage(message.body);
              log.debug("ws_state_message", {
                machineId,
                topic: receivedTopic,
                status: nextState.status,
              });
              onStateTopicMessage(nextState);
            }
          });

          client?.subscribe(`${config.streamTopicPrefix}/${machineId}`, (message: IMessage) => {
            if (messageMatchesAnyTopic(message.body, streamTopics)) {
              const receivedTopic = readMessageTopic(message.body);
              const powerWatts = readPowerWatts(message.body);
              log.debug("ws_stream_message", {
                machineId,
                topic: receivedTopic,
                powerWatts,
              });
              onPowerUpdate(powerWatts);
            }
          });
        },
        onStompError: (frame: IFrame) => {
          const message = frame.headers.message ?? "Realtime STOMP protocol error.";
          log.error("ws_protocol_error", {
            machineId,
            message,
            details: frame.body,
          });
          onError(message);
        },
        onWebSocketError: () => {
          log.error("ws_error", {
            machineId,
          });
          onError("Realtime websocket error.");
        },
        onWebSocketClose: (event: CloseEvent) => {
          log.warn("ws_closed", {
            machineId,
            code: event.code,
            reason: event.reason,
          });
        },
      });

      client.activate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open realtime connection.";
      log.error("ws_connect_failed", {
        machineId,
        attempt: setupAttempt,
        message,
      });
      onError(message);

      setupAttempt += 1;
      const backoff = Math.min(15_000, Math.round(500 * 2 ** setupAttempt + Math.random() * 250));
      reconnectTimer = window.setTimeout(() => {
        void openConnection();
      }, backoff);
    }
  };

  void openConnection();

  return () => {
    isDisposed = true;

    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
    }

    log.info("ws_cleanup_close", {
      machineId,
    });
    void client?.deactivate();
  };
}

export async function fetchMachineList(): Promise<MachineListItem[]> {
  log.debug("machine_list_fetch_start");
  const response = await fetch("/api/protonest/machines", {
    method: "GET",
    headers: jsonHeaders(),
    cache: "no-store",
  });

  const payload = await parseJsonResponse<MachineListResponse>(response);
  log.info("machine_list_fetch_success", {
    count: payload.machines.length,
  });
  return payload.machines;
}

export async function fetchDashboardData(
  machineId: string,
  channelId: string | null,
): Promise<DashboardData> {
  log.debug("dashboard_fetch_start", {
    machineId,
  });

  const params = new URLSearchParams();
  if (channelId) {
    params.set("channel", channelId);
  }
  const query = params.toString();
  const endpoint = `/api/protonest/dashboard/${encodeURIComponent(machineId)}${query ? `?${query}` : ""}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: jsonHeaders(),
    cache: "no-store",
  });

  const payload = await parseJsonResponse<DashboardResponse>(response);
  log.info("dashboard_fetch_success", {
    machineId,
    status: payload.data.machine.status,
  });
  return payload.data;
}

export async function updateElapsedTime(machineId: string, hours: number): Promise<void> {
  log.debug("elapsed_update_start", {
    machineId,
    hours,
  });

  const response = await fetch(`/api/protonest/elapsed/${encodeURIComponent(machineId)}`, {
    method: "POST",
    headers: jsonHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      hours,
    }),
  });

  await parseJsonResponse<ElapsedUpdateResponse>(response);

  log.info("elapsed_update_success", {
    machineId,
    hours,
  });
}

export async function updateConfigurations(
  machineId: string,
  payload: DeviceConfigurationsPayload,
): Promise<void> {
  log.debug("configurations_update_start", {
    machineId,
    ...payload,
  });

  const response = await fetch(
    `/api/protonest/configurations/${encodeURIComponent(machineId)}`,
    {
      method: "POST",
      headers: jsonHeaders(),
      cache: "no-store",
      body: JSON.stringify(payload),
    },
  );

  await parseJsonResponse<ConfigurationsUpdateResponse>(response);

  log.info("configurations_update_success", {
    machineId,
  });
}
