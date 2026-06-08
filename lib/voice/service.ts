export type VoiceEmotion = "neutral" | "whisper" | "angry" | "tired" | "afraid" | "excited";

export type TranscriptionRequest = {
  audio: Blob | ArrayBuffer | Uint8Array;
  language?: string;
  speakerHint?: string;
};

export type SpeechRequest = {
  text: string;
  voiceId?: string;
  emotion?: VoiceEmotion;
};

export type VoicePreviewRequest = {
  voiceId?: string;
  sampleText?: string;
  emotion?: VoiceEmotion;
};

export type NpcVoiceRequest = {
  npcId: string;
  name: string;
  personality?: string;
  voiceMannerisms?: string;
};

export const voiceService = {
  async transcribe(_request: TranscriptionRequest) {
    return {
      text: "",
      confidence: 0,
      provider: "none",
      warning: "Voice transcription provider is not configured yet."
    };
  },

  async speak(_request: SpeechRequest) {
    return {
      audioUrl: null as string | null,
      provider: "none",
      warning: "Text-to-speech provider is not configured yet."
    };
  },

  async previewVoice(request: VoicePreviewRequest) {
    return {
      voiceId: request.voiceId ?? "text-only",
      sampleText: request.sampleText ?? "Welcome to Eternum.",
      audioUrl: null as string | null,
      provider: "none"
    };
  },

  async createNpcVoice(request: NpcVoiceRequest) {
    return {
      npcId: request.npcId,
      voiceId: `npc:${request.npcId}:text-only`,
      provider: "none",
      notes: `Text-only voice profile prepared for ${request.name}.`
    };
  },

  async assignNpcVoice({ npcId, voiceId }: { npcId: string; voiceId: string }) {
    return {
      npcId,
      voiceId,
      assigned: true,
      provider: "none"
    };
  }
};
