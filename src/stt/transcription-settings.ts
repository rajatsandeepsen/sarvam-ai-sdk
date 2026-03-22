import { z } from "zod";

export type TranscriptionModelId =
	| "saaras:v3" // State-of-the-art model
	| "saarika:v2.5"
	| (string & {});

export const transcriptionProviderOptionsSchema = z.object({
	mode: z
		.enum(["transcribe", "translate", "verbatim", "translit", "codemix"])
		.default("transcribe"),
	with_timestamps: z.boolean().nullish().default(false),
	with_diarization: z.boolean().nullish().default(false),
	num_speakers: z.number().int().nullish(),
});

export type TranscriptionCallOptions = {
	/**
	 * @default "transcribe"
	 *
	 * @description
	 * - `transcribe`: Standard transcription in the original language, `output`: Text in source language
	 * - `translate`: Transcribe and translate to English, `output`: English text
	 * - `verbatim`: Word-for-word transcription including filler words and repetitions, `output`: Verbatim text in source language
	 * - `translit`: Transcribe and transliterate to Roman script, `output`: Romanized text
	 * - `codemix`: Transcribe code-mixed speech (e.g., Hindi-English) naturally, `output`: Code-mixed text
	 */
	mode?: z.infer<typeof transcriptionProviderOptionsSchema.shape.mode>;
	/**
	 * - Chunk-level timestamp support
	 * - Useful for subtitle alignment and audio navigation
	 * - Provides start and end times for each segment of text
	 */
	with_timestamps?: boolean;
	/**
	 * Enables speaker diarization, which identifies and separates different speakers in the audio.
	 * When set to true, the API will provide speaker-specific segments in the response.
	 * Note: This parameter is currently in Beta mode.
	 */
	with_diarization?: boolean;
	/**
	 * Number of speakers to be detected in the audio.
	 * This is used when with_diarization is set to true.
	 * Can be null.
	 */
	num_speakers?: number;
};

export const transcriptionResponseSchema = z.object({
	request_id: z.string().nullable(),
	transcript: z.string(),
	language_code: z.string().nullable(),
	timestamps: z
		.object({
			end_time_seconds: z.array(z.number()),
			start_time_seconds: z.array(z.number()),
			words: z.array(z.string()),
		})
		.optional(),
	diarized_transcript: z
		.object({
			entries: z.array(
				z.object({
					end_time_seconds: z.array(z.number()),
					start_time_seconds: z.array(z.number()),
					transcript: z.string(),
					speaker_id: z.string(),
				}),
			),
		})
		.optional(),
});
