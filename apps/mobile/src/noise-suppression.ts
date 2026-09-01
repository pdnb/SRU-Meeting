export const NOISE_SUPPRESSION_STORAGE_KEY = "sru-noise-suppression";

let sessionNoiseSuppressionEnabled = false;

/** Session-scoped preference until AsyncStorage is wired. */
export function readNoiseSuppressionPreference(): boolean {
  return sessionNoiseSuppressionEnabled;
}

export function writeNoiseSuppressionPreference(enabled: boolean): void {
  sessionNoiseSuppressionEnabled = enabled;
}

export function shouldAttachMobileNoiseSuppression(supported: boolean): boolean {
  return supported;
}

export async function attachMobileNoiseSuppression(input: {
  setProcessor: (processor: unknown) => Promise<void>;
  getProcessor: () => unknown;
  createProcessor: () => unknown;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false }> {
  try {
    if (!input.getProcessor()) {
      await input.setProcessor(input.createProcessor());
    }
    const processor = input.getProcessor() as {
      setEnabled?: (enabled: boolean) => Promise<boolean>;
    };
    if (processor?.setEnabled) {
      await processor.setEnabled(input.enabled);
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
