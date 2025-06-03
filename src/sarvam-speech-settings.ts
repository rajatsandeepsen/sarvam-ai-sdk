import { z } from "zod";

export type SarvamSpeechModelId = "bulbul:v1" | "bulbul:v2" | (string & {});

export type SarvamSpeechVoices = z.infer<typeof SpeakerSchema>;

export const SpeakerSchema = z
    .enum([
        "meera",
        "pavithra",
        "maitreyi",
        "arvind",
        "amol",
        "amartya",
        "diya",
        "neel",
        "misha",
        "vian",
        "arjun",
        "maya",
        "anushka",
        "abhilash",
        "manisha",
        "vidya",
        "arya",
        "karun",
        "hitesh",
    ])
    .default("meera");

// https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert
export const SarvamProviderOptionsSchema = z
    .object({
        speaker: SpeakerSchema,
        pitch: z.number().min(-0.75).max(0.75).default(0.0),
        pace: z.number().min(0.5).max(2.0).default(1.0),
        loudness: z.number().min(0.3).max(3.0).default(1.0),
        speech_sample_rate: z
            .union([
                z.literal(8000),
                z.literal(16000),
                z.literal(22050),
                z.literal(24000),
            ])
            .default(22050),
        enable_preprocessing: z.boolean().default(false),
    })
    .partial();

/**
 * Configuration settings for Sarvam Text-to-Speech API.
 *
 * This type defines the customizable options for generating speech audio
 * using the Sarvam Text-to-Speech API. Each property corresponds to a specific
 * feature or parameter supported by the API.
 */
export type SarvamSpeechSettings = {
    /**
     * The speaker voice to be used for the output audio.
     *
     * @default "meera"
     * @example "meera" (Default female voice for bulbul:v1)
     * @example "arvind" (Male voice for bulbul:v1)
     * @example "anushka" (Female voice for bulbul:v2)
     */
    speaker?: SarvamSpeechVoices;

    /**
     * Controls the pitch of the audio.
     *
     * @default 0.0
     * @example -0.5 (Deeper voice)
     * @example 0.5 (Sharper voice)
     */
    pitch?: number;

    /**
     * Controls the speed of the audio.
     *
     * @default 1.0
     * @example 0.5 (Slower speech)
     * @example 2.0 (Faster speech)
     */
    pace?: number;

    /**
     * Controls the loudness of the audio.
     *
     * @default 1.0
     * @example 0.3 (Quieter audio)
     * @example 2.5 (Louder audio)
     */
    loudness?: number;

    /**
     * Specifies the sample rate of the output audio.
     *
     * @default 22050
     * @example 8000 (Low-quality audio)
     * @example 24000 (High-quality audio)
     */
    speech_sample_rate?: 8000 | 16000 | 22050 | 24000;

    /**
     * Enables preprocessing for normalization of English words and numeric entities
     * (e.g., numbers, dates) in the input text.
     *
     * @default false
     * @example true (Enable preprocessing)
     * @example false (Disable preprocessing)
     */
    enable_preprocessing?: boolean;
};
