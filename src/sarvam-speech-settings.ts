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
