import { getDeviceFingerprint, clearFingerprintCache } from "./fingerprint";

type SessionSnapshot = {
  deviceFingerprint?: string;
};

/**
 * Load the current device fingerprint for session identification.
 * The fingerprint is generated asynchronously using FingerprintJS.
 */
export const loadSessionAsync = async (): Promise<SessionSnapshot> => {
  const deviceFingerprint = await getDeviceFingerprint();

  return {
    deviceFingerprint,
  };
};

export const clearSession = () => {
  clearFingerprintCache();
};
