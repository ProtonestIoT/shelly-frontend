import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import { getServerSessionToken } from "@/src/lib/protonest/client";

const log = createLogger("api-ws-auth", "server");

export async function GET() {
  try {
    log.debug("request_start");
    const token = await getServerSessionToken();
    log.info("request_success", { expiresAtMs: token.expiresAtMs });

    return NextResponse.json(token, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue websocket auth token.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
