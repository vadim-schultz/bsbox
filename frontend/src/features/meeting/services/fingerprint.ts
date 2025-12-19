import FingerprintJS, { Agent } from "@fingerprintjs/fingerprintjs";

const FINGERPRINT_STORAGE_KEY = "muda_device_fingerprint";

let agentPromise: Promise<Agent> | null = null;
let cachedFingerprint: string | null = null;

/**
 * Initialize the FingerprintJS agent (singleton pattern).
 * The agent is loaded once and reused for all fingerprint requests.
 */
function getAgent(): Promise<Agent> {
  if (!agentPromise) {
    agentPromise = FingerprintJS.load();
  }
  return agentPromise;
}

/**
 * Get the cached fingerprint from localStorage if available.
 */
function getStoredFingerprint(): string | null {
  try {
    return localStorage.getItem(FINGERPRINT_STORAGE_KEY);
  } catch {
    // localStorage might be unavailable (e.g., private browsing)
    return null;
  }
}

/**
 * Store the fingerprint in localStorage for faster subsequent loads.
 */
function storeFingerprint(fingerprint: string): void {
  try {
    localStorage.setItem(FINGERPRINT_STORAGE_KEY, fingerprint);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Generate a device fingerprint using FingerprintJS.
 * The fingerprint is cached in memory and localStorage for performance.
 * 
 * @returns A stable visitor ID string unique to this browser/device
 */
export async function getDeviceFingerprint(): Promise<string> {
  // Return cached fingerprint if available
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  // Check localStorage for previously stored fingerprint
  const stored = getStoredFingerprint();
  if (stored) {
    cachedFingerprint = stored;
    return stored;
  }

  // Generate new fingerprint
  const agent = await getAgent();
  const result = await agent.get();
  const fingerprint = result.visitorId;

  // Cache and persist the fingerprint
  cachedFingerprint = fingerprint;
  storeFingerprint(fingerprint);

  return fingerprint;
}

/**
 * Clear the cached fingerprint (useful for testing or forced refresh).
 */
export function clearFingerprintCache(): void {
  cachedFingerprint = null;
  try {
    localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}


