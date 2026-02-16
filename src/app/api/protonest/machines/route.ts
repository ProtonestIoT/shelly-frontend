import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import { getServerConfig } from "@/src/lib/protonest/config";

const log = createLogger("api-machines", "server");

export async function GET() {
  try {
    log.debug("request_start");
    const config = getServerConfig();

    return NextResponse.json(
      {
        machines: config.machineCatalog.map((machine) => ({
          id: machine.id,
          name: machine.name,
          status: "UNKNOWN",
          channels: machine.channels,
        })),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load machines.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
