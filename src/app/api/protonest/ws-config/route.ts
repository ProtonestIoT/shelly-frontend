import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import { getPublicConfig, getServerConfig } from "@/src/lib/protonest/config";

const log = createLogger("api-ws-config", "server");

export async function GET() {
  try {
    log.debug("request_start");
    const publicConfig = getPublicConfig();
    const serverConfig = getServerConfig();
    log.info("request_success", {
      wsEnabled: publicConfig.wsEnabled,
      wsUrlConfigured: Boolean(publicConfig.wsUrl),
      stateTopicPrefix: publicConfig.stateTopicPrefix,
      streamTopicPrefix: publicConfig.streamTopicPrefix,
      stateTopicFallback: serverConfig.stateTopicFallback,
      streamPowerTopic: serverConfig.streamPowerTopic,
    });

    return NextResponse.json(
      {
        config: {
          ...publicConfig,
          stateTopicFallback: serverConfig.stateTopicFallback,
          streamPowerTopic: serverConfig.streamPowerTopic,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load realtime config.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
