type LogLevel = "debug" | "info" | "warn" | "error";

type LoggerRuntime = "server" | "client";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACTED_KEYS = [
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "refresh",
  "jwt",
];

function normalizeLevel(value: string | undefined, fallback: LogLevel): LogLevel {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
    return normalized;
  }

  return fallback;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[Truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const lowered = key.toLowerCase();
      const shouldRedact = REDACTED_KEYS.some((match) => lowered.includes(match));
      result[key] = shouldRedact ? "[REDACTED]" : sanitizeValue(nested, depth + 1);
    }
    return result;
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}...[truncated]`;
  }

  return value;
}

function getConfig(runtime: LoggerRuntime): { enabled: boolean; minLevel: LogLevel } {
  if (runtime === "client") {
    return {
      enabled: readBoolean(process.env.NEXT_PUBLIC_APP_LOGGING_ENABLED, false),
      minLevel: normalizeLevel(process.env.NEXT_PUBLIC_APP_LOG_LEVEL, "info"),
    };
  }

  return {
    enabled: readBoolean(process.env.APP_LOGGING_ENABLED, false),
    minLevel: normalizeLevel(process.env.APP_LOG_LEVEL, "info"),
  };
}

function selectConsole(level: LogLevel): (...values: unknown[]) => void {
  if (level === "debug") {
    return console.debug;
  }
  if (level === "info") {
    return console.info;
  }
  if (level === "warn") {
    return console.warn;
  }
  return console.error;
}

export interface Logger {
  debug: (event: string, context?: Record<string, unknown>) => void;
  info: (event: string, context?: Record<string, unknown>) => void;
  warn: (event: string, context?: Record<string, unknown>) => void;
  error: (event: string, context?: Record<string, unknown>) => void;
}

export function createLogger(scope: string, runtime: LoggerRuntime): Logger {
  const write = (level: LogLevel, event: string, context?: Record<string, unknown>) => {
    const config = getConfig(runtime);
    if (!config.enabled) {
      return;
    }

    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[config.minLevel]) {
      return;
    }

    const sink = selectConsole(level);
    const timestamp = new Date().toISOString();
    const payload = context ? sanitizeValue(context) : undefined;

    if (payload) {
      sink(`[${timestamp}] [${runtime}] [${scope}] [${level}] ${event}`, payload);
      return;
    }

    sink(`[${timestamp}] [${runtime}] [${scope}] [${level}] ${event}`);
  };

  return {
    debug: (event, context) => {
      write("debug", event, context);
    },
    info: (event, context) => {
      write("info", event, context);
    },
    warn: (event, context) => {
      write("warn", event, context);
    },
    error: (event, context) => {
      write("error", event, context);
    },
  };
}
