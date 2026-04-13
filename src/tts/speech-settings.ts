import { z } from "zod";

/**
 * Specifies the speech generation model to use.
 *
 * - `bulbul:v3`: Latest model with improved quality, 30+ voices, and temperature control
 */
export type SpeechModelId = "bulbul:v3" | (string & {});

export const SpeakerSchema = z.enum([
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
export const speechOptionsSchema = z
	.object({
		speaker: SpeakerSchema,
		pace: z.number().min(0.5).max(2.0),
		speech_sample_rate: z.union([
			z.literal(8000),
			z.literal(16000),
			z.literal(22050),
			z.literal(24000),
			z.literal(32000),
			z.literal(44100),
			z.literal(48000),
		]),
		output_audio_codec: outputAudioCodecSchema,
		temperature: z.number().min(0.01).max(2),
		dict_id: z.string(),
	})
	.partial();

/**
 * Configuration settings for Sarvam Text-to-Speech API (bulbul:v3).
 */
export type SpeechSettings = {
	/**
	 * The speaker voice to be used for the output audio.
	 *
	 * @default "shubh"
	 */
	speaker?: z.infer<typeof SpeakerSchema>;

	/**
	 * Controls the speed of the audio. Range: `0.5 - 2.0`
	 *
	 * @default 1.0
	 * @example 0.5 (Slower speech)
	 * @example 2.0 (Faster speech)
	 */
	pace?: number;

	/**
	 * Specifies the sample rate of the output audio.
	 *
	 * @default 24000
	 */
	speech_sample_rate?: 8000 | 16000 | 22050 | 24000 | 32000 | 44100 | 48000;

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
	 * Range: `0.01 - 2`
	 * @default 0.6
	 */
	temperature?: number;

	/**
	 * The ID of a pronunciation dictionary to apply during synthesis.
	 * When provided, matching words in the input text will be replaced with their custom pronunciations before generating speech.
	 */
	dict_id?: string;
};

export const speechResponseSchema = z.object({
	request_id: z.string().nullish(),
	audios: z.array(z.string()),
});
