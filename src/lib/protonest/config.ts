interface MachineCatalogEntry {
  id: string;
  name: string;
}

export interface ProtonestServerConfig {
  apiBaseUrl: string;
  authEmail: string;
  authPassword: string;
  totalWorktimeTopic: string;
  machineCatalog: MachineCatalogEntry[];
}

export function getServerConfig(): ProtonestServerConfig {
  const apiBaseUrl = process.env.PROTONEST_API_BASE_URL?.trim();
  const authEmail = process.env.PROTONEST_AUTH_EMAIL?.trim();
  const authPassword = process.env.PROTONEST_AUTH_PASSWORD?.trim();
  const totalWorktimeTopic = process.env.PROTONEST_TOTALWORKTIME_TOPIC?.trim();
  const machineCatalogRaw = process.env.PROTONEST_MACHINE_CATALOG_JSON;

  if (!apiBaseUrl) {
    throw new Error("PROTONEST_API_BASE_URL is not configured.");
  }

  if (!authEmail || !authPassword) {
    throw new Error(
      "PROTONEST_AUTH_EMAIL and PROTONEST_AUTH_PASSWORD must be configured.",
    );
  }

  if (!totalWorktimeTopic) {
    throw new Error("PROTONEST_TOTALWORKTIME_TOPIC is not configured.");
  }

  if (!machineCatalogRaw) {
    throw new Error("PROTONEST_MACHINE_CATALOG_JSON is not configured.");
  }

  let machineCatalog: unknown;
  try {
    machineCatalog = JSON.parse(machineCatalogRaw);
  } catch {
    throw new Error("PROTONEST_MACHINE_CATALOG_JSON is not valid JSON.");
  }

  if (!Array.isArray(machineCatalog)) {
    throw new Error("PROTONEST_MACHINE_CATALOG_JSON must be a JSON array.");
  }

  const normalized = machineCatalog.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(
        `PROTONEST_MACHINE_CATALOG_JSON item at index ${index} is invalid.`,
      );
    }

    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";

    if (!id || !name) {
      throw new Error(
        `PROTONEST_MACHINE_CATALOG_JSON item at index ${index} must include non-empty id and name.`,
      );
    }

    return { id, name };
  });

  return {
    apiBaseUrl,
    authEmail,
    authPassword,
    totalWorktimeTopic,
    machineCatalog: normalized,
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
