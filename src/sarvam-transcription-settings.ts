import { z } from "zod";

export type SarvamTranscriptionModelId =
    | "saarika:v2"
    | "saarika:v1"
    | "saarika:flash"
    | (string & {});

export type SarvamSpeechTranslationModelId =
    | "saaras:v1"
    | "saaras:v2"
    | "saaras:turbo"
    | "saaras:flash"
    | (string & {});

export const SarvamProviderOptionsSchema = z.object({
    with_timestamps: z.boolean().nullish().default(false),
    with_diarization: z.boolean().nullish().default(false),
    num_speakers: z.number().int().nullish(),
});

export type SarvamTranscriptionCallOptions = {
    with_timestamps?: boolean,
    /**
     * Enables speaker diarization, which identifies and separates different speakers in the audio.
     * When set to true, the API will provide speaker-specific segments in the response.
     * Note: This parameter is currently in Beta mode.
     */
    with_diarization?: boolean,
    /**
     * Number of speakers to be detected in the audio.
     * This is used when with_diarization is set to true.
     * Can be null.
     */
    num_speakers?: number,
}
