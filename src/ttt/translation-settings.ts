import z from "zod";
import {
	type MoreSarvamLanguageCode,
	MoreSarvamLanguageCodeSchema,
	type SarvamLanguageCode,
	SarvamLanguageCodeSchema,
} from "../config";

/**
 * Specifies the translation model to use.
 *
 * - `mayura:v1`: Supports 12 languages with all modes, output scripts, and automatic language detection.
 * - `sarvam-translate:v1`: Supports all 22 scheduled languages of India, formal mode only
 */
export type TranslationModelId =
	| "mayura:v1"
	| "sarvam-translate:v1"
	| (string & {});

export type TranslationSettings<
	T extends TranslationModelId = TranslationModelId,
> = {
	/**
	 * The language code of the input text. This specifies the source language for transliteration.
	 *
	 * @default "auto"
	 * `mayura:v1` supports automatic language detection using ‘auto’ as the source language code.
	 */
	from?:
		| SarvamLanguageCode
		| (T extends "mayura:v1" ? "auto" : never)
		| (T extends "sarvam-translate:v1" ? MoreSarvamLanguageCode : never);
	/**
	 * The language code of the transliteration text. This specifies the target language for transliteration.
	 */
	to:
		| SarvamLanguageCode
		| (T extends "sarvam-translate:v1" ? MoreSarvamLanguageCode : never);

	/**
	 * If `international` format is selected, we use regular numerals (0-9). For example: मेरा phone number है: 9840950950
	 *
	 * If `native` format is selected, we use language-specific native numerals, like: मेरा phone number है: ९८४०९५०९५०
	 *
	 * @default "international"
	 */
	numerals_format?: "native" | "international";

	/**
		* Specifies the gender of the speaker for better translations.
		* This feature is only supported for code-mixed translation models.
		*
		* @example
			Input: "मैंने कहा कि मैं आऊंगा।"
			Output (male): "I said that I will come."
			Output (female): "I said that I will come."
		*/
	speaker_gender?: "Male" | "Female";

	/**
		* Specifies the tone or style of the translation.
		*
		* @example
			Input: "आप कैसे हैं?"
			Output (formal): "How are you?"
			Output (modern-colloquial): "What's up?"
			Output (classic-colloquial): "How art thou?"
			Output (code-mixed): "How are you, bhai?"
		* @default "formal"
		*/
	mode?:
		| "formal"
		| (T extends "mayura:v1"
				? "modern-colloquial" | "classic-colloquial" | "code-mixed"
				: never);

	/**
	 * Enables custom preprocessing of the input text, which can result in better translations.
	 *
	 * @default false
	 */
	enable_preprocessing?: boolean;

	/**
    * Controls the transliteration style applied to the output text.
    *
    * @example
        Input: "Your EMI of Rs. 3000 is pending."
        Output (roman): "aapka Rs. 3000 ka EMI pending hai."
        Output (fully-native): "आपका रु. 3000 का ई.एम.ऐ. पेंडिंग है।"
        Output (spoken-form-in-native): "आपका थ्री थाउजेंड रूपीस का ईएमअइ पेंडिंग है।"
    * @default null
    */
	output_script?: "roman" | "fully-native" | "spoken-form-in-native";
};

export const translationSettingsSchema = z.object({
	from: z
		.union([
			SarvamLanguageCodeSchema,
			MoreSarvamLanguageCodeSchema,
			z.literal("auto"),
		])
		.default("auto"),
	to: z.union([SarvamLanguageCodeSchema, MoreSarvamLanguageCodeSchema]),
	numerals_format: z.enum(["native", "international"]).nullish(),
	speaker_gender: z.enum(["Male", "Female"]).nullish(),
	mode: z
		.enum(["formal", "modern-colloquial", "classic-colloquial", "code-mixed"])
		.nullish(),
	enable_preprocessing: z.boolean().nullish(),
	output_script: z
		.enum(["roman", "fully-native", "spoken-form-in-native"])
		.nullish(),
});

export const translationResponseSchema = z.object({
	translated_text: z.string().nullish(),
	source_language_code: z.string().nullish(),
	request_id: z.string().nullish(),
});
