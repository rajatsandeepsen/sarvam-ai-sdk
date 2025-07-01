import type { SarvamLanguageCode } from "./sarvam-config";
import type { SarvamSpeechVoices } from "./sarvam-speech-settings";
import type { SarvamTranscriptionModelId } from "./sarvam-transcription-settings";

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
    language_code?: "unknown" | SarvamLanguageCode;

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

export type SarvamSpeechAPITypes = {
    /**
     * The voice to use when generating the audio.
     * @default 'Meera'
     */
    voice?: SarvamSpeechVoices;

    /**
     * The speed of the generated audio.
     * Select a value from 0.25 to 4.0.
     * @default 1.0
     */
    // speed?: number;

    /**
     * The format of the generated audio.
     * @default 'WAV'
     */
    // response_format?: "wav"; // "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

    /**
     * Instructions for the speech generation e.g. "Speak in a slow and steady tone".
     * Does not work with tts-1 or tts-1-hd.
     */
    // instructions?: string;
};
