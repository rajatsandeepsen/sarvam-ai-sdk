import type {
	LanguageModelV1,
	SpeechModelV1,
	TranscriptionModelV1,
} from "@ai-sdk/provider";

import type { ChatModelId, ChatSettings } from "./chat/settings";
import type { MoreSarvamLanguageCode, SarvamLanguageCode } from "./config";

import type {
	SpeechTranslationModelId,
	SpeechTranslationSettings,
} from "./stt/speech-translation-settings";
import type {
	TranscriptionModelId,
	TranscriptionSettings,
} from "./stt/transcription-settings";
import type { SpeechModelId, SpeechSettings } from "./tts/speech-settings";
import type {
	TranslationModelId,
	TranslationSettings,
} from "./ttt/translation-settings";
import type { TransliterateSettings } from "./ttt/transliterate-settings";

export type SarvamProvider = {
	/**
	 * Creates a model for text generation.
	 */
	(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV1;

	/**
	 * Creates an Sarvam chat model for text generation.
	 */
	languageModel(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV1;

	/**
	 * Creates a Sarvam model for chat.
	 */
	chat(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV1;

	/**
	 * Creates a Sarvam model for transcription.
	 */
	transcription<T extends TranscriptionModelId>(
		modelId: T,
		/**
		 * Audio source language code
		 * Note: This parameter is optional for saarika:v2.5 model.
		 *
		 * @default unknown
		 */
		languageCode?:
			| (T extends "saaras:v3" ? MoreSarvamLanguageCode : never)
			| SarvamLanguageCode
			| "unknown",
		settings?: TranscriptionSettings<T>,
	): TranscriptionModelV1;

	/**
	 * Creates a Sarvam model for Speech translation.
	 */
	speechTranslation<T extends SpeechTranslationModelId>(
		modelId: T,
		settings?: SpeechTranslationSettings,
	): TranscriptionModelV1;

	/**
	 * Creates a Sarvam model for speech.
	 */
	speech<T extends SpeechModelId>(
		modelId: T,
		languageCode: SarvamLanguageCode,
		settings?: SpeechSettings<T>,
	): SpeechModelV1;

	/**
	 * Creates an Sarvam model for transliterate.
	 */
	transliterate(settings: TransliterateSettings): LanguageModelV1;

	/**
	 * Creates an Sarvam model for translation.
	 */
	translation<T extends TranslationModelId>(
		model: T,
		settings: TranslationSettings<T>,
	): LanguageModelV1;

	/**
	 * Creates an Sarvam model for language identification.
	 */
	languageIdentification(): LanguageModelV1;
};
