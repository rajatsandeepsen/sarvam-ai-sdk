import type {
	LanguageModelV1,
	SpeechModelV1,
	TranscriptionModelV1,
} from "@ai-sdk/provider";
import {
	type FetchFunction,
	loadApiKey,
	withoutTrailingSlash,
} from "@ai-sdk/provider-utils";
import { SarvamChatLanguageModel } from "./chat/language-model";
import type { ChatModelId, ChatSettings } from "./chat/settings";
import type { SarvamLanguageCode } from "./config";
import { SarvamSpeechTranslationModel } from "./stt/speech-translation-model";
import type { SpeechTranslationModelId } from "./stt/speech-translation-settings";
import { SarvamTranscriptionModel } from "./stt/transcription-model";
import type {
	TranscriptionCallOptions,
	TranscriptionModelId,
} from "./stt/transcription-settings";
import { SarvamSpeechModel } from "./tts/speech-model";
import type {
	SarvamSpeechModelId,
	SarvamSpeechSettings,
} from "./tts/speech-settings";
import { SarvamLidModel } from "./ttt/lid-model";
import { SarvamTranslationModel } from "./ttt/translation-model";
import type {
	TranslationModelId,
	TranslationSettings,
} from "./ttt/translation-settings";
import { SarvamTransliterateModel } from "./ttt/transliterate-model";
import type { TransliterateSettings } from "./ttt/transliterate-settings";

export interface SarvamProvider {
	/**
	 * Creates a model for text generation.
	 */
	(
		/**
		 * @description Sarvam-M (24B) is now a legacy model. But we recommend migrating to Sarvam-30B or Sarvam-105B for improved performance.
		 */
		modelId: ChatModelId,
		settings?: ChatSettings,
	): LanguageModelV1;

	/**
	 * Creates an Sarvam chat model for text generation.
	 */
	languageModel(
		/**
		 * @description Sarvam-M (24B) is now a legacy model. But we recommend migrating to Sarvam-30B or Sarvam-105B for improved performance.
		 */
		modelId: ChatModelId,
		settings?: ChatSettings,
	): LanguageModelV1;

	/**
	 * Creates a Sarvam model for transcription.
	 */
	transcription(
		modelId: TranscriptionModelId,
		/**
		 * Audio source language code
		 *
		 * @default unknown
		 */
		languageCode?: SarvamLanguageCode | "unknown",
		settings?: TranscriptionCallOptions,
	): TranscriptionModelV1;

	/**
	 * Creates a Sarvam model for Speech translation.
	 */
	speechTranslation(modelId: SpeechTranslationModelId): TranscriptionModelV1;

	/**
	 * Creates a Sarvam model for speech.
	 */
	speech(
		modelId: SarvamSpeechModelId,
		languageCode: SarvamLanguageCode,
		settings?: SarvamSpeechSettings,
	): SpeechModelV1;

	/**
	 * Creates an Sarvam model for transliterate.
	 */
	transliterate(settings: TransliterateSettings): LanguageModelV1;

	/**
	 * Creates an Sarvam model for translation.
	 */
	translation(
		model: TranslationModelId,
		settings: TranslationSettings,
	): LanguageModelV1;

	/**
	 * Creates an Sarvam model for language identification.
	 */
	languageIdentification(): LanguageModelV1;
}

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
	 * Custom headers to include in the requests.
	 * @default
	 * Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
	 * "api-subscription-key": process.env.SARVAM_API_KEY
	 */
	headers?: Record<string, string>;

	/**
	 * Custom fetch implementation. You can use it as a middleware to intercept requests,
	 * or to provide a custom fetch implementation for e.g. testing.
	 */
	fetch?: FetchFunction;
}

/**
 * Create an Sarvam provider instance.
 */
export function createSarvam(
	options: SarvamProviderSettings = {},
): SarvamProvider {
	const baseURL =
		withoutTrailingSlash(options.baseURL) ?? "https://api.sarvam.ai";

	const getApiKey = () =>
		loadApiKey({
			apiKey: options.apiKey,
			environmentVariableName: "SARVAM_API_KEY",
			description: "Sarvam",
		});

	const getHeaders = () => ({
		Authorization: `Bearer ${getApiKey()}`,
		"api-subscription-key": getApiKey(),
		...options.headers,
	});

	const createChatModel = (modelId: ChatModelId, settings: ChatSettings = {}) =>
		new SarvamChatLanguageModel(modelId, settings, {
			provider: "sarvam.chat",
			url: ({ path }) => `${baseURL}/v1${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	const createLanguageModel = (
		modelId: ChatModelId,
		settings?: ChatSettings,
	) => {
		if (new.target) {
			throw new Error(
				"The Sarvam model function cannot be called with the new keyword.",
			);
		}

		return createChatModel(modelId, settings);
	};

	const createTranscriptionModel = (
		modelId: TranscriptionModelId,
		languageCode: SarvamLanguageCode | "unknown" = "unknown",
		settings?: TranscriptionCallOptions,
	) =>
		new SarvamTranscriptionModel(modelId, languageCode, {
			provider: "sarvam.transcription",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
			transcription: settings,
		});

	const createSpeechTranslation = (modelId: TranscriptionModelId) =>
		new SarvamSpeechTranslationModel(modelId, {
			provider: "sarvam.speech-translation",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	const createSpeechModel = (
		modelId: SarvamSpeechModelId,
		languageCode: SarvamLanguageCode,
		settings?: SarvamSpeechSettings,
	) =>
		new SarvamSpeechModel(modelId, languageCode, {
			provider: "sarvam.speech",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
			speech: settings,
		});

	const createTransliterateModel = (settings: TransliterateSettings) =>
		new SarvamTransliterateModel(settings, {
			provider: "sarvam.transliterate",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	const createTranslationModel = (
		model: TranslationModelId,
		settings: TranslationSettings,
	) =>
		new SarvamTranslationModel(model, settings, {
			provider: "sarvam.translation",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	const createLidModel = () =>
		new SarvamLidModel({
			provider: "sarvam.lid",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	const provider = (modelId: ChatModelId, settings?: ChatSettings) =>
		createLanguageModel(modelId, settings);

	provider.languageModel = createLanguageModel;
	provider.chat = createChatModel;
	provider.transcription = createTranscriptionModel;
	provider.speechTranslation = createSpeechTranslation;
	provider.speech = createSpeechModel;
	provider.transliterate = createTransliterateModel;
	provider.translation = createTranslationModel;
	provider.languageIdentification = createLidModel;

	return provider;
}

/**
 * Default Sarvam provider instance.
 */
export const sarvam = createSarvam();
