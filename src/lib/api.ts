import type { DashboardData, MachineListItem } from "@/src/types/dashboard";
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

interface RealtimeConnectionOptions {
  machineId: string;
  onStateTopicMessage: () => void;
  onError: (message: string) => void;
}

interface PublicRealtimeConfig {
  wsEnabled: boolean;
  wsUrl: string | null;
  stateTopicPrefix: string | null;
  streamTopicPrefix: string | null;
  totalWorktimeTopic: string;
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

function parseStompFrames(rawPayload: string): Array<Record<string, string> & { command: string; body: string }> {
  const chunkList = rawPayload.split("\u0000").map((entry) => entry.trim()).filter(Boolean);

  return chunkList
    .map((chunk) => {
      const lines = chunk.split("\n");
      const command = lines[0]?.trim();

      if (!command) {
        return null;
      }

      const headers: Record<string, string> = {};
      let cursor = 1;
      while (cursor < lines.length && lines[cursor] !== "") {
        const [key, ...valueParts] = lines[cursor].split(":");
        headers[key] = valueParts.join(":");
        cursor += 1;
      }

      const body = lines.slice(cursor + 1).join("\n");
      return { command, body, ...headers };
    })
    .filter((frame): frame is Record<string, string> & { command: string; body: string } => frame !== null);
}

function buildStompFrame(command: string, headers: Record<string, string>, body = ""): string {
  const headerBlock = Object.entries(headers)
    .map(([key, value]) => `${key}:${value}`)
    .join("\n");

  return `${command}\n${headerBlock}\n\n${body}\u0000`;
}

function messageMatchesTopic(body: string, totalWorktimeTopic: string): boolean {
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

    return topicCandidates.some(
      (candidate) =>
        typeof candidate === "string" &&
        candidate.trim().toLowerCase() === totalWorktimeTopic.trim().toLowerCase(),
    );
  } catch {
    return false;
  }
}

export function connectRealtimeMachineUpdates({
  machineId,
  onStateTopicMessage,
  onError,
}: RealtimeConnectionOptions): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let isDisposed = false;
  let attempt = 0;

  const openConnection = async () => {
    if (isDisposed) {
      return;
    }

    try {
      log.info("ws_connect_start", {
        machineId,
        attempt,
      });

      const config = await fetchRealtimeConfig();
      if (!config.wsEnabled) {
        log.info("ws_disabled_by_config", {
          machineId,
        });
        return;
      }

      if (!config.wsUrl || !config.stateTopicPrefix || !config.streamTopicPrefix) {
        throw new Error("Realtime websocket config is incomplete.");
      }

      const auth = await fetchWsAuthToken();
      socket = new WebSocket(config.wsUrl);

      socket.addEventListener("open", () => {
        if (!socket || isDisposed) {
          return;
        }

        attempt = 0;
        log.info("ws_open", {
          machineId,
        });
        socket.send(
          buildStompFrame("CONNECT", {
            "accept-version": "1.2",
            "heart-beat": "10000,10000",
            Authorization: `Bearer ${auth.accessToken}`,
          }),
        );
      });

      socket.addEventListener("message", (event) => {
        const payload = typeof event.data === "string" ? event.data : "";
        const frames = parseStompFrames(payload);

        for (const frame of frames) {
          if (frame.command === "CONNECTED") {
            log.info("ws_connected_subscribing", {
              machineId,
            });

            socket?.send(
              buildStompFrame("SUBSCRIBE", {
                id: `state-${machineId}`,
                destination: `${config.stateTopicPrefix}/${machineId}`,
              }),
            );

            socket?.send(
              buildStompFrame("SUBSCRIBE", {
                id: `stream-${machineId}`,
                destination: `${config.streamTopicPrefix}/${machineId}`,
              }),
            );
            continue;
          }

          if (frame.command === "MESSAGE" && messageMatchesTopic(frame.body, config.totalWorktimeTopic)) {
            log.debug("ws_totalworktime_message", {
              machineId,
            });
            onStateTopicMessage();
            continue;
          }

          if (frame.command === "ERROR") {
            log.error("ws_protocol_error", {
              machineId,
            });
            onError("Realtime connection returned a protocol error.");
          }
        }
      });

      socket.addEventListener("close", () => {
        if (isDisposed) {
          return;
        }

        attempt += 1;
        const backoff = Math.min(15_000, Math.round(500 * 2 ** attempt + Math.random() * 250));
        log.warn("ws_closed_reconnecting", {
          machineId,
          attempt,
          backoff,
        });
        reconnectTimer = window.setTimeout(() => {
          void openConnection();
        }, backoff);
      });

      socket.addEventListener("error", () => {
        log.error("ws_error", {
          machineId,
        });
        onError("Realtime websocket error.");
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open realtime connection.";
      log.error("ws_connect_failed", {
        machineId,
        attempt,
        message,
      });
      onError(message);

      attempt += 1;
      const backoff = Math.min(15_000, Math.round(500 * 2 ** attempt + Math.random() * 250));
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

    if (socket && socket.readyState === WebSocket.OPEN) {
      log.info("ws_cleanup_close", {
        machineId,
      });
      socket.close(1000, "Client cleanup");
    }
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

export async function fetchDashboardData(machineId: string): Promise<DashboardData> {
  log.debug("dashboard_fetch_start", {
    machineId,
  });

  const response = await fetch(`/api/protonest/dashboard/${encodeURIComponent(machineId)}`, {
    method: "GET",
    headers: jsonHeaders(),
    cache: "no-store",
  });

  const payload = await parseJsonResponse<DashboardResponse>(response);
  log.info("dashboard_fetch_success", {
    machineId,
    state: payload.data.machine.state,
  });
  return payload.data;
}
