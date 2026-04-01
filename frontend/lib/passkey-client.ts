import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export type WebAuthnCredentialJSON = Record<string, unknown>;

export async function isPasskeyAutofillAvailable(): Promise<boolean> {
  const pkc = (globalThis as any).PublicKeyCredential as any;
  if (!pkc?.isConditionalMediationAvailable) return false;
  try {
    return await pkc.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

export async function passkeyAuthenticate(
  publicKeyOptions: Record<string, unknown>,
  opts?: { useAutofill?: boolean; signal?: AbortSignal }
): Promise<WebAuthnCredentialJSON> {
  return (await startAuthentication({
    optionsJSON: publicKeyOptions as any,
    useBrowserAutofill: opts?.useAutofill ?? false,
    signal: opts?.signal,
  } as any)) as unknown as WebAuthnCredentialJSON;
}

export async function passkeyRegister(
  publicKeyOptions: Record<string, unknown>
): Promise<WebAuthnCredentialJSON> {
  return (await startRegistration({
    optionsJSON: publicKeyOptions as any,
  } as any)) as unknown as WebAuthnCredentialJSON;
}

export function isPasskeyUserCancelError(error: unknown): boolean {
  const e = error as { name?: string; message?: string };
  const name = e?.name ?? "";
  const message = (e?.message ?? "").toLowerCase();

  if (name === "AbortError" || name === "NotAllowedError") return true;
  return (
    message.includes("not allowed") ||
    message.includes("timed out") ||
    message.includes("cancel")
  );
}

