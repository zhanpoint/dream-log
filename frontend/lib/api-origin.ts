const DEV_LOCAL_BACKEND_PORT = 8001;
const PROD_LOCAL_BACKEND_PORT = 8000;

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function buildLocalApiOrigin(runtimeUrl: URL): string {
  const port =
    process.env.NODE_ENV === "development"
      ? DEV_LOCAL_BACKEND_PORT
      : PROD_LOCAL_BACKEND_PORT;
  return `${runtimeUrl.protocol}//${runtimeUrl.hostname}:${port}`;
}

export function resolveApiOrigin(runtimeUrl?: URL): string {
  if (runtimeUrl && isLocalHostname(runtimeUrl.hostname)) {
    return buildLocalApiOrigin(runtimeUrl);
  }

  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  return runtimeUrl ? runtimeUrl.origin : "";
}

export function getBrowserApiOrigin(): string {
  if (typeof window === "undefined") {
    return resolveApiOrigin();
  }

  return resolveApiOrigin(new URL(window.location.href));
}

export function getWebSocketOrigin(apiOrigin: string): string {
  if (apiOrigin.startsWith("https://")) {
    return apiOrigin.replace("https://", "wss://");
  }
  if (apiOrigin.startsWith("http://")) {
    return apiOrigin.replace("http://", "ws://");
  }
  return apiOrigin;
}
