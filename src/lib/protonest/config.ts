export interface ProtonestServerConfig {
  apiBaseUrl: string;
  authEmail: string;
  authPassword: string;
  projectId: string;
  googleSheetUrl: string | null;
}

export function getServerConfig(): ProtonestServerConfig {
  const apiBaseUrl = process.env.PROTONEST_API_BASE_URL?.trim();
  const authEmail = process.env.PROTONEST_AUTH_EMAIL?.trim();
  const authPassword = process.env.PROTONEST_AUTH_PASSWORD?.trim();
  const projectId = process.env.PROTONEST_PROJECT_ID?.trim();
  const googleSheetUrl = process.env.PROTONEST_GOOGLE_SHEET_URL?.trim() || null;

  if (!apiBaseUrl) {
    throw new Error("PROTONEST_API_BASE_URL is not configured.");
  }

  if (!authEmail || !authPassword) {
    throw new Error(
      "PROTONEST_AUTH_EMAIL and PROTONEST_AUTH_PASSWORD must be configured.",
    );
  }

  if (!projectId) {
    throw new Error("PROTONEST_PROJECT_ID is not configured.");
  }

  return {
    apiBaseUrl,
    authEmail,
    authPassword,
    projectId,
    googleSheetUrl,
  };
}

export interface ProtonestPublicConfig {
  wsEnabled: boolean;
  wsUrl: string | null;
  stateTopicPrefix: string | null;
  streamTopicPrefix: string | null;
}

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

export function getPublicConfig(): ProtonestPublicConfig {
  const wsEnabled = readBoolean(process.env.NEXT_PUBLIC_PROTONEST_WS_ENABLED, true);
  const wsUrl = process.env.NEXT_PUBLIC_PROTONEST_WS_URL?.trim();
  const stateTopicPrefix = process.env.NEXT_PUBLIC_PROTONEST_STATE_TOPIC_PREFIX?.trim();
  const streamTopicPrefix = process.env.NEXT_PUBLIC_PROTONEST_STREAM_TOPIC_PREFIX?.trim();

  if (!wsEnabled) {
    return {
      wsEnabled,
      wsUrl: null,
      stateTopicPrefix: null,
      streamTopicPrefix: null,
    };
  }

  if (!wsUrl) {
    throw new Error("NEXT_PUBLIC_PROTONEST_WS_URL is not configured.");
  }

  if (!stateTopicPrefix) {
    throw new Error(
      "NEXT_PUBLIC_PROTONEST_STATE_TOPIC_PREFIX is not configured.",
    );
  }

  if (!streamTopicPrefix) {
    throw new Error(
      "NEXT_PUBLIC_PROTONEST_STREAM_TOPIC_PREFIX is not configured.",
    );
  }

  return {
    wsEnabled,
    wsUrl,
    stateTopicPrefix,
    streamTopicPrefix,
  };
}
