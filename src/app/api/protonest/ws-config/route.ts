import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import { getPublicConfig } from "@/src/lib/protonest/config";

const log = createLogger("api-ws-config", "server");

export async function GET() {
  try {
    log.debug("request_start");
    const publicConfig = getPublicConfig();
    log.info("request_success", {
      wsEnabled: publicConfig.wsEnabled,
      wsUrlConfigured: Boolean(publicConfig.wsUrl),
      stateTopicPrefix: publicConfig.stateTopicPrefix,
      streamTopicPrefix: publicConfig.streamTopicPrefix,
    });

    return NextResponse.json(
      {
        config: {
          ...publicConfig,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load realtime config.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
