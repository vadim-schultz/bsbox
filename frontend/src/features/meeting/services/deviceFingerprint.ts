import FingerprintJS from "@fingerprintjs/fingerprintjs";

const STORAGE_KEY = "bsbox.deviceFingerprint.v1";

let fpAgentPromise: Promise<FingerprintJS.Agent> | null = null;
let fingerprintPromise: Promise<string> | null = null;

function safeGetStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSetStored(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore write failures (e.g., disabled storage)
  }
}

async function loadAgent(): Promise<FingerprintJS.Agent> {
  if (!fpAgentPromise) {
    fpAgentPromise = FingerprintJS.load();
  }
  return fpAgentPromise;
}

async function generateFingerprint(): Promise<string> {
  try {
    const agent = await loadAgent();
    const result = await agent.get();
    return result.visitorId;
  } catch (err) {
    console.error("[deviceFingerprint] Failed to generate fingerprint, falling back:", err);
    // Fall back to a random UUID if available to avoid blocking the join flow
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // Last-resort fallback
    return Math.random().toString(36).slice(2);
  }
}

export async function getDeviceFingerprint(): Promise<string> {
  if (fingerprintPromise) {
    return fingerprintPromise;
  }

  fingerprintPromise = (async () => {
    const cached = safeGetStored();
    if (cached) {
      return cached;
    }
    const fp = await generateFingerprint();
    safeSetStored(fp);
    return fp;
  })();

  return fingerprintPromise;
}

