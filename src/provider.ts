import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { SarvamChatLanguageModel } from "./chat/language-model";
import type { ChatModelId, ChatSettings } from "./chat/settings";
import type { SarvamProviderSettings } from "./config";
import { SarvamSpeechTranslationModel } from "./stt/speech-translation-model";
import { SarvamTranscriptionModel } from "./stt/transcription-model";
import { SarvamSpeechModel } from "./tts/speech-model";
import { SarvamLidModel } from "./ttt/lid-model";
import { SarvamTranslationModel } from "./ttt/translation-model";
import { SarvamTransliterateModel } from "./ttt/transliterate-model";
import type { SarvamProvider } from "./type";

/**
 * Create an Sarvam provider instance.
 */
export function createSarvam(options: SarvamProviderSettings = {}) {
	const baseURL =
		withoutTrailingSlash(options.baseURL) ?? "https://api.sarvam.ai";

	const getApiKey = () =>
		loadApiKey({
			apiKey: options.apiKey,
			environmentVariableName: "SARVAM_API_KEY",
			description: "Sarvam",
		});

	const getHeaders = () => {
		const apiKey = getApiKey();
		return {
			Authorization: `Bearer ${apiKey}`,
			"api-subscription-key": apiKey,
			...options.headers,
		};
	};

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

	const provider: SarvamProvider = (modelId, settings) =>
		createLanguageModel(modelId, settings);

	provider.chat = createChatModel;
	provider.languageModel = createLanguageModel;

	provider.speech = (modelId, languageCode, settings) =>
		new SarvamSpeechModel(modelId, languageCode, {
			provider: "sarvam.speech",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
			speech: settings,
		});

	provider.transcription = (modelId, languageCode, settings) =>
		new SarvamTranscriptionModel(modelId, languageCode ?? "unknown", {
			provider: "sarvam.transcription",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
			transcription: settings,
		});

	provider.speechTranslation = (modelId, settings) =>
		new SarvamSpeechTranslationModel(modelId, {
			provider: "sarvam.speech-translation",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
			speechTranslation: settings,
		});

	provider.transliterate = (settings) =>
		new SarvamTransliterateModel(settings, {
			provider: "sarvam.transliterate",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	provider.translation = (model, settings) =>
		new SarvamTranslationModel(model, settings, {
			provider: "sarvam.translation",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	provider.languageIdentification = () =>
		new SarvamLidModel({
			provider: "sarvam.lid",
			url: ({ path }) => `${baseURL}${path}`,
			headers: getHeaders,
			fetch: options.fetch,
		});

	return provider;
}

/**
 * Default Sarvam provider instance.
 */
export const sarvam = createSarvam();
