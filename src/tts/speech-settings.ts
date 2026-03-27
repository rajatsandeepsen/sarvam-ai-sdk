import { z } from "zod";

/**
 * Specifies the speech generation model to use.
 *
 * - `bulbul:v3`: Latest model with improved quality, 30+ voices, and temperature control
 * - `bulbul:v2`: Legacy model with pitch and loudness controls
 */
export type SpeechModelId = "bulbul:v2" | "bulbul:v3" | (string & {});

const bulbul_v2 = z.enum([
	// male
	"abhilash",
	"karun",
	"hitesh",
	// female
	"anushka",
	"manisha",
	"vidya",
	"arya",
]);

const bulbul_v3 = z.enum([
	// male
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
	// female
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
]);

export type SarvamSpeechVoices = z.infer<typeof SpeakerSchema>;

export const SpeakerSchema = z.union([bulbul_v2, bulbul_v3]);

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
		pitch: z.number().min(-0.75).max(0.75),
		pace: z.number().min(0.3).max(3.0),
		loudness: z.number().min(0.3).max(3.0),
		speech_sample_rate: z.union([
			z.literal(8000),
			z.literal(16000),
			z.literal(22050),
			z.literal(24000),
			z.literal(32000),
			z.literal(44100),
			z.literal(48000),
		]),
		enable_preprocessing: z.boolean(),
		output_audio_codec: outputAudioCodecSchema,
		temperature: z.number().min(0.01).max(2),
		dict_id: z.string(),
		enable_cached_responses: z.boolean(),
	})
	.partial();

/**
 * Configuration settings for Sarvam Text-to-Speech API.
 *
 * This type defines the customizable options for generating speech audio
 * using the Sarvam Text-to-Speech API. Each property corresponds to a specific
 * feature or parameter supported by the API.
 */
export type SpeechSettings<T extends SpeechModelId = SpeechModelId> = {
	/**
	 * The speaker voice to be used for the output audio.
	 *
	 * @default
	 * - `bulbul:v3`: "shubh" (Male voice)
	 * - `bulbul:v2`: "anushka" (Female voice)
	 */
	speaker?: z.infer<
		T extends "bulbul:v3" ? typeof bulbul_v3 : typeof bulbul_v2
	>;

	/**
	 * Controls the pitch of the audio.
	 *
	 * This parameter is only supported for bulbul:v2. It is NOT supported for bulbul:v3.
	 *
	 * @default 0.0
	 * @example -0.5 (Deeper voice)
	 * @example 0.5 (Sharper voice)
	 */
	pitch?: T extends "bulbul:v2" ? number : never;

	/**
	 * Controls the speed of the audio. Any number inbetween `0.3 - 3`
	 *
	 * @default 1.0
	 * @example 0.5 (Slower speech)
	 * @example 2.0 (Faster speech)
	 *
	 * - bulbul:v3: 0.5 to 2.0
	 * - bulbul:v2: 0.3 to 3.0
	 */
	pace?: number;

	/**
	 * Controls the loudness of the audio. Any number inbetween `0.3 - 3`
	 *
	 * @default 1.0
	 * @example 0.3 (Quieter audio)
	 * @example 2.5 (Louder audio)
	 *
	 * This parameter is only supported for bulbul:v2. It is NOT supported for bulbul:v3.
	 */
	loudness?: T extends "bulbul:v2" ? number : never;

	/**
	 * Specifies the sample rate of the output audio.
	 *
	 * @default 24000
	 * @example 8000 (Low-quality audio)
	 * @example 24000 (High-quality audio)
	 */
	speech_sample_rate?:
		| 8000
		| 16000
		| 22050
		| 24000
		| (T extends "bulbul:v3" ? 32000 | 44100 | 48000 : never);

	/**
	 * Enables preprocessing for normalization of English words and numeric entities
	 * (e.g., numbers, dates) in the input text.
	 *
	 * @default false
	 * @example true (Enable preprocessing)
	 * @example false (Disable preprocessing)
	 */
	enable_preprocessing?: T extends "bulbul:v2" ? boolean : never;

	/**
	 * Specifies the audio codec for the output audio file.
	 * Different codecs offer various compression and quality characteristics.
	 */
	output_audio_codec?: z.infer<typeof outputAudioCodecSchema>;
	/**
	 * Temperature controls how much randomness and expressiveness the TTS model uses while generating speech.
	 * Lower values produce more stable and consistent output,
	 * while higher values sound more expressive but may introduce artifacts or errors.
	 *
	 * Any number inbetween `0.01 - 2`
	 * @default 0.6
	 *
	 * Note: This parameter is only supported for bulbul:v3. It has no effect on bulbul:v2.
	 */
	temperature?: T extends "bulbul:v3" ? number : never;

	/**
	 * The ID of a pronunciation dictionary to apply during synthesis.
	 * When provided, matching words in the input text will be replaced with their custom pronunciations before generating speech.
	 *
	 * Only supported by bulbul:v3.
	 */
	dict_id?: T extends "bulbul:v3" ? string : never;

	/**
	 * Enable caching for the request. When enabled, identical requests will return cached audio instead of regenerating.
	 *
	 * @default false
	 *
	 * Currently in beta and only available for bulbul:v1 and bulbul:v2 models.
	 */
	enable_cached_responses?: T extends "bulbul:v3" ? never : boolean;
};

export const sarvamSpeechResponseSchema = z.object({
	request_id: z.string(),
	audios: z.array(z.string()),
});
