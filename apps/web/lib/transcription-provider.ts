import type { TranscriptionSegmentInput } from "@sru/shared";

export interface TranscriptionProvider {
  transcribe(audioObjectKey: string | null): Promise<TranscriptionSegmentInput[]>;
}

/** Stub STT provider — returns no segments until a real provider is wired. */
export class StubTranscriptionProvider implements TranscriptionProvider {
  async transcribe(audioObjectKey: string | null): Promise<TranscriptionSegmentInput[]> {
    void audioObjectKey;
    return [];
  }
}

export function createTranscriptionProvider(): TranscriptionProvider {
  return new StubTranscriptionProvider();
}
