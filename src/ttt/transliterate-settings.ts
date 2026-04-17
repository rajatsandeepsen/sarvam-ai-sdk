import z from "zod";
import { type SarvamLanguageCode, SarvamLanguageCodeSchema } from "../config";

export type TransliterateSettings<
	S extends boolean = true,
	T extends SarvamLanguageCode = SarvamLanguageCode,
	F extends SarvamLanguageCode | "auto" =
		| "auto"
		| "en-IN"
		| (S extends true
				? SarvamLanguageCode
				: T extends "en-IN"
					? SarvamLanguageCode
					: T),
> = {
	/**
	 * The language code of the input text. This specifies the source language for transliteration.
	 *
	 * @default "auto"
	 */
	from?: F;
	/**
	 * The language code of the transliteration text. This specifies the target language for transliteration.
	 */
	to: T;

	/**
	 * If `international` format is selected, we use regular numerals (0-9). For example: मेरा phone number है: 9840950950
	 *
	 * If `native` format is selected, we use language-specific native numerals, like: मेरा phone number है: ९८४०९५०९५०
	 *
	 * @default "international"
	 */
	numerals_format?: "native" | "international";

	/**
    * Converts text into a natural spoken form when True. Note: No effect if output language is en-IN.
    * @example
        Input: मुझे कल 9:30am को appointment है
        Output: मुझे कल सुबह साढ़े नौ बजे को अपॉइंटमेंट है
    * @default false
    */
	spoken_form?: boolean;

	/**
    * only works when `spoken_form` is true
    *
    *    If `english`, Numbers in the text will be spoken in English.
    *
    *    If `native`, Numbers in the text will be spoken in the native language.
    * @example
        Input: “मेरे पास ₹200 है”
        Output:
             “मेरे पास टू हन्डर्ड रूपीस है” (If english format is selecte)
             “मेरे पास दो सौ रुपये है” (If native format is selected)
    * @default "native"
    */
	spoken_form_numerals_language?: "english" | "native";
};

export const transliterateSettingsSchema = z.object({
	from: z.union([SarvamLanguageCodeSchema, z.literal("auto")]).default("auto"),
	to: SarvamLanguageCodeSchema,
	numerals_format: z.enum(["native", "international"]).nullish(),
	spoken_form: z.boolean().nullish(),
	spoken_form_numerals_language: z.enum(["english", "native"]).nullish(),
});

export const transliterateResponseSchema = z.object({
	transliterated_text: z.string().nullish(),
	source_language_code: SarvamLanguageCodeSchema.nullish(),
	request_id: z.string().nullish(),
});
