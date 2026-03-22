import { z } from "zod";

export type SarvamSpeechModelId = "bulbul:v2" | "bulbul:v3" | (string & {});

export type SarvamSpeechVoices = z.infer<typeof SpeakerSchema>;

export const SpeakerSchema = z
	.enum([
		// male bulbul:v2
		"abhilash",
		"karun",
		"hitesh",

		// female bulbul:v2
		"anushka",
		"manisha",
		"vidya",
		"arya",

		// male bulbul:v3
		"shubh",
		"aditya",
		"rahul",
		"rohan",
		"amit",
		"dev",
		"ratan",
		"varun",
		"manan",
		"sumit",
		"kabir",
		"aayan",
		"ashutosh",
		"advait",
		"anand",
		"tarun",
		"sunny",
		"mani",
		"gokul",
		"vijay",
		"mohit",
		"rehan",
		"soham",

		// female bulbul:v3
		"ritu",
		"priya",
		"neha",
		"pooja",
		"simran",
		"kavya",
		"ishita",
		"shreya",
		"roopa",
		"amelia",
		"sophia",
		"tanya",
		"shruti",
		"suhani",
		"kavitha",
		"rupali",
	])

export const outputAudioCodecSchema = z.enum([
	"mp3",
	"linear16",
	"mulaw",
	"alaw",
	"opus",
	"flac",
	"aac",
	"wav",
]);

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
		output_audio_codec: outputAudioCodecSchema.optional(),
		temperature: z.number().min(0.01).max(2).default(0.6),
		dict_id: z.string().optional(),
		enable_cached_responses: z.boolean().default(false),
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
	 * @default
	 * - "shubh" (Male voice for bulbul:v3)
	 * - "anushka" (Female voice for bulbul:v2)
	 * - "meera" (Female voice for bulbul:v1)
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

	/**
	 * Specifies the audio codec for the output audio file.
	 * Different codecs offer various compression and quality characteristics.
	 */
	output_audio_codec?:
		| "mp3"
		| "linear16"
		| "mulaw"
		| "alaw"
		| "opus"
		| "flac"
		| "aac"
		| "wav";
	/**
	 * Temperature controls how much randomness and expressiveness the TTS model uses while generating speech.
	 * Lower values produce more stable and consistent output,
	 * while higher values sound more expressive but may introduce artifacts or errors.
	 *
	 * Any number inbetween 0.01 - 2
	 * @default 0.6
	 *
	 * Note: This parameter is only supported for bulbul:v3. It has no effect on bulbul:v2.
	 */
	temperature?: number;

	/**
	 * The ID of a pronunciation dictionary to apply during synthesis.
	 * When provided, matching words in the input text will be replaced with their custom pronunciations before generating speech.
	 *
	 * Only supported by bulbul:v3.
	 */
	dict_id?: string;

	/**
	 * Enable caching for the request. When enabled, identical requests will return cached audio instead of regenerating.
	 *
	 * @default false
	 *
	 * Currently in beta and only available for bulbul:v1 and bulbul:v2 models.
	 */
	enable_cached_responses?: boolean;
};
