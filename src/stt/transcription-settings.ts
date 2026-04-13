import { z } from "zod";

/**
 * - `saaras:v3`: State-of-the-art model with 23-language support and flexible output formats.
 *   Supports multiple modes via the mode parameter: transcribe, translate, verbatim, translit, codemix.
 */
export type TranscriptionModelId = "saaras:v3" | (string & {});

export const transcriptionProviderOptionsSchema = z.object({
	mode: z
		.enum(["transcribe", "translate", "verbatim", "translit", "codemix"])
		.nullish(),
	with_timestamps: z.boolean().nullish(),
});

export type TranscriptionSettings = {
	/**
	 * Mode of operation.
	 *
	 * @default "transcribe"
	 *
	 * @description
	 * - `transcribe`: Standard transcription in the original language, `output`: Text in source language
	 * - `translate`: Transcribe and translate to English, `output`: English text
	 * - `verbatim`: Word-for-word transcription including filler words and repetitions, `output`: Verbatim text in source language
	 * - `translit`: Transcribe and transliterate to Roman script, `output`: Romanized text
	 * - `codemix`: Transcribe code-mixed speech (e.g., Hindi-English) naturally, `output`: Code-mixed text
	 */
	mode?: "transcribe" | "translate" | "verbatim" | "translit" | "codemix";
	/**
	 * Chunk-level timestamp support.
	 * Provides start and end times for each segment of text.
	 * Useful for subtitle alignment and audio navigation.
	 */
	with_timestamps?: boolean;
};

export const transcriptionResponseSchema = z.object({
	request_id: z.string().nullish(),
	transcript: z.string(),
	language_code: z.string().nullish(),
	language_probability: z.number().nullish(),
	timestamps: z
		.object({
			words: z.array(z.string()),
			start_time_seconds: z.array(z.number()),
			end_time_seconds: z.array(z.number()),
		})
		.nullish(),
	diarized_transcript: z
		.object({
			entries: z.array(
				z.object({
					end_time_seconds: z.number(),
					start_time_seconds: z.number(),
					transcript: z.string(),
					speaker_id: z.string(),
				}),
			),
		})
		.nullish(),
});
