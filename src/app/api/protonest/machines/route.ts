import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import { fetchProjectMachineList } from "@/src/lib/protonest/client";

const log = createLogger("api-machines", "server");

export async function GET() {
  try {
    log.debug("request_start");
    const machines = await fetchProjectMachineList();

    return NextResponse.json(
      {
        machines,
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
