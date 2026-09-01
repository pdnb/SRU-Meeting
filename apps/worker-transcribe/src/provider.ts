import type { TranscriptionSegmentInput } from "@sru/shared";

export interface TranscriptionProvider {
  transcribe(audioObjectKey: string | null): Promise<TranscriptionSegmentInput[]>;
}

/** Stub STT provider — no Whisper or cloud calls until Task 71 provider is chosen. */
export class StubTranscriptionProvider implements TranscriptionProvider {
  async transcribe(audioObjectKey: string | null): Promise<TranscriptionSegmentInput[]> {
    void audioObjectKey;
    return [];
  }
}

export function createTranscriptionProvider(): TranscriptionProvider {
  return new StubTranscriptionProvider();
}
