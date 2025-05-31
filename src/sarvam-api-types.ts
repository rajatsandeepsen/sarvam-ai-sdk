import { SarvamTranscriptionLanguageCode, SarvamTranscriptionModelId } from "./sarvam-transcription-settings";

export type SarvamChatPrompt = Array<SarvamMessage>;

export type SarvamMessage =
    | SarvamSystemMessage
    | SarvamUserMessage
    | SarvamAssistantMessage
    | SarvamToolMessage;

export interface SarvamSystemMessage {
    role: "system";
    content: string;
}

export interface SarvamUserMessage {
    role: "user";
    content: string | Array<SarvamContentPart>;
}

export type SarvamContentPart = SarvamContentPartText | SarvamContentPartImage;

export interface SarvamContentPartImage {
    type: "image_url";
    image_url: { url: string };
}

export interface SarvamContentPartText {
    type: "text";
    text: string;
}

export interface SarvamAssistantMessage {
    role: "assistant";
    content?: string | null;
    tool_calls?: Array<SarvamMessageToolCall>;
}

export interface SarvamMessageToolCall {
    type: "function";
    id: string;
    function: {
        arguments: string;
        name: string;
    };
}

export interface SarvamToolMessage {
    role: "tool";
    content: string;
    tool_call_id: string;
}

export type SarvamTranscriptionAPITypes = {
  /**
   * Specifies the model to use for speech-to-text conversion.
   * @default 'saarika:v2'
   */
  model?: SarvamTranscriptionModelId;

  /**
   * Specifies the language of the input audio.
   * Required for the 'saarika:v1' model. Optional for 'saarika:v2'.
   * 'unknown' lets the API detect the language automatically (not supported by 'saarika:v1').
   */
    language_code?: SarvamTranscriptionLanguageCode;

  /**
   * Enables timestamps in the response.
   * If set to true, the response will include timestamps in the transcript.
   * @default false
   */
  with_timestamps?: boolean;

  /**
   * Enables speaker diarization, which identifies and separates different speakers in the audio.
   * When set to true, the API will provide speaker-specific segments in the response.
   * Note: This parameter is currently in Beta mode.
   * @default false
   */
  with_diarization?: boolean;

  /**
   * Number of speakers to be detected in the audio.
   * This is used when with_diarization is set to true.
   * Can be null.
   */
  num_speakers?: number | null;
};
