import type { FetchFunction } from "@ai-sdk/provider-utils";
import { z } from "zod";

export type SarvamConfig = {
	provider: string;
	url: (options: { modelId: string; path: string }) => string;
	headers: () => Record<string, string | undefined>;
	fetch?: FetchFunction;
	generateId?: () => string;
};

export type SarvamLanguageCode = z.infer<typeof SarvamLanguageCodeSchema>;

export const SarvamLanguageCodeSchema = z.enum([
	"hi-IN", // Hindi
	"bn-IN", // Bengali
	"kn-IN", // Kannada
	"ml-IN", // Malayalam
	"mr-IN", // Marathi
	"od-IN", // Odia
	"pa-IN", // Punjabi
	"ta-IN", // Tamil
	"te-IN", // Telugu
	"en-IN", // English (India)
	"gu-IN", // Gujarati
]);

export type MoreSarvamLanguageCode = z.infer<
	typeof MoreSarvamLanguageCodeSchema
>;

export const MoreSarvamLanguageCodeSchema = z.enum([
	"as-IN",  // Assamese
	"ur-IN",  // Urdu
	"ne-IN",  // Nepali
	"kok-IN", // Konkani
	"ks-IN",  // Kashmiri
	"sd-IN",  // Sindhi
	"sa-IN",  // Sanskrit
	"sat-IN", // Santali
	"mni-IN", // Manipuri
	"brx-IN", // Bodo
	"mai-IN", // Maithili
	"doi-IN", // Dogri
]);

export type SarvamScriptCode = z.infer<typeof SarvamScriptCodeSchema>;

export const SarvamScriptCodeSchema = z.enum([
	"Latn",
	"Deva",
	"Beng",
	"Gujr",
	"Knda",
	"Mlym",
	"Orya",
	"Guru",
	"Taml",
	"Telu",
]);
