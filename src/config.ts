import type { FetchFunction } from "@ai-sdk/provider-utils";
import { z } from "zod";

export type SarvamConfig = {
	provider: string;
	url: (options: { modelId: string; path: string }) => string;
	headers: () => Record<string, string | undefined>;
	fetch?: FetchFunction;
	generateId?: () => string;
};

/**
 * Specifies the language in BCP-47 format.
 */
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
	"as-IN", // Assamese
	"ur-IN", // Urdu
	"ne-IN", // Nepali
	"kok-IN", // Konkani
	"ks-IN", // Kashmiri
	"sd-IN", // Sindhi
	"sa-IN", // Sanskrit
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

export interface SarvamProviderSettings {
	/**
	 * URL for the Sarvam API calls.
	 * @default https://api.sarvam.ai
	 */
	baseURL?: string;

	/**
	 * API key for authenticating requests.
	 * @default process.env.SARVAM_API_KEY
	 */
	apiKey?: string;

	/**
	 * Custom headers to include in the requests (merged with defaults; can override e.g. User-Agent).
	 * @default
	 * Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
	 * "api-subscription-key": process.env.SARVAM_API_KEY,
	 * "User-Agent": "sarvam-vercel-sdk"
	 */
	headers?: Record<string, string>;

	/**
	 * Custom fetch implementation. You can use it as a middleware to intercept requests,
	 * or to provide a custom fetch implementation for e.g. testing.
	 */
	fetch?: FetchFunction;
}
