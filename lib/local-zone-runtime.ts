const databaseUrlPattern = /^postgresql:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/[^?\s]+(\?schema=public)$/;

export function isLocalZoneRuntimeEnabled() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return Boolean(databaseUrl && databaseUrlPattern.test(databaseUrl));
}

export function localZoneUnavailableResponse() {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "This local Zone OS endpoint is not available in the web deployment."
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" }
    }
  );
}

export function assertLocalZoneRuntimeEnabled() {
  if (!isLocalZoneRuntimeEnabled()) {
    throw localZoneUnavailableResponse();
  }
}
