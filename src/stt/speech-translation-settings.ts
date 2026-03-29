import z from "zod";
import { input_audio_codec } from "./utils";

/**
 * Specifies the speech generation model to use.
 *
 * - `saaras:v2.5`: Translation model that translates audio from any spoken Indic language to English.
 * - `saaras:v3`: Translation model that translates audio from any spoken Indic language to English, with improved accuracy and support for more languages.
 */
export type SpeechTranslationModelId =
	| "saaras:v3"
	| "saaras:v2.5"
	| (string & {});

export const speechTranslationSettingsSchema = z.object({
	input_audio_codec: input_audio_codec.nullish(),
});

export type SpeechTranslationSettings = {
	/**
	 * Audio codec/format of the input file.
	 *
	 * Our API automatically detects all codec formats, but for PCM files specifically (pcm_s16le, pcm_l16, pcm_raw), you must pass this parameter.
	 * PCM files are supported only at 16kHz sample rate.
	 */
	input_audio_codec?: z.infer<typeof input_audio_codec>;
};

export const speechTranslationResponseSchema = z.object({
	request_id: z.string().nullish(),
	transcript: z.string(),
	language_code: z.string().nullish(),
	diarized_transcript: z
		.object({
			entries: z.array(
				z.object({
					transcript: z.string(),
					start_time_seconds: z.number(),
					end_time_seconds: z.number(),
					speaker_id: z.string(),
				}),
			),
		})
		.nullish(),
});
