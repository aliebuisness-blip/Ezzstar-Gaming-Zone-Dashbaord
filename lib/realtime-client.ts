import { validateRuntimeEnv } from "./env";

type PcCommand = "command:start-session" | "command:end-session" | "command:add-time" | "command:lock" | "command:show-message";

function buildCommandPayload(command: PcCommand, payload?: unknown) {
  if (command === "command:start-session") {
    return { type: command, session: payload ?? {} };
  }

  if (command === "command:end-session") {
    return { type: command, reason: (payload as { reason?: string } | undefined)?.reason ?? "Session ended" };
  }

  if (command === "command:add-time") {
    return {
      type: command,
      durationSeconds: (payload as { durationSeconds?: number } | undefined)?.durationSeconds,
      startTime: (payload as { startTime?: string } | undefined)?.startTime,
      serverTime: (payload as { serverTime?: string } | undefined)?.serverTime
    };
  }

  if (command === "command:show-message") {
    return {
      type: command,
      message: (payload as { message?: string } | undefined)?.message ?? "Dashboard command test"
    };
  }

  return { type: command, payload: payload ?? {} };
}

export async function sendPcCommand(pcId: string, command: PcCommand, payload?: unknown) {
  const { NEXT_PUBLIC_REALTIME_URL, REALTIME_INTERNAL_SECRET } = validateRuntimeEnv();
  const commandLabel =
    command === "command:start-session"
      ? "start"
      : command === "command:end-session"
        ? "end"
        : command === "command:add-time"
          ? "add-time"
          : "lock";

  try {
    if (/^PC-\d+$/.test(pcId)) {
      console.error(`Command failed: ${command}. Expected database PC id but received display name ${pcId}.`);
      return false;
    }

    console.log(`Dispatching command to database pcId: ${pcId}`);

    if (command === "command:start-session") {
      console.log(`Attempting start command to ${pcId}`);
    }

    const response = await fetch(`${NEXT_PUBLIC_REALTIME_URL}/internal/pc-command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": REALTIME_INTERNAL_SECRET
      },
      body: JSON.stringify({ pcId, command: buildCommandPayload(command, payload) })
    });
    console.log(`Realtime bridge response status ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      if (command === "command:start-session") {
        console.error(`Start command failed: ${pcId} not connected`);
      } else {
        console.error(`${commandLabel} command failed: ${pcId}. ${error}`);
      }
      return false;
    }

    if (command === "command:start-session") {
      console.log(`Start command sent to ${pcId}`);
    } else {
      console.log(`${commandLabel} command sent to ${pcId}`);
    }
    return true;
  } catch (error) {
    if (command === "command:start-session") {
      console.error(`Start command failed: ${pcId} not connected`);
    } else {
      console.error(`${commandLabel} command failed: ${pcId}. ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }
}
