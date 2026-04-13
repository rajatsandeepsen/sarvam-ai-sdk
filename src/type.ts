import type {
	LanguageModelV3,
	SpeechModelV3,
	TranscriptionModelV3,
} from "@ai-sdk/provider";

import type { ChatModelId, ChatSettings } from "./chat/settings";
import type { MoreSarvamLanguageCode, SarvamLanguageCode } from "./config";
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
import type { SarvamDocumentIntelligence } from "./vision/document-intelligence";

export type SarvamProvider = {
	/**
	 * Creates a model for text generation.
	 * @example
	 * 	const { text } = await generateText({
	 * 		model: sarvam("sarvam-30b"),
	 * 		prompt: "Translate this to malayalam: 'Keep cooking, guys'",
	 * 	});
	 */
	(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV3;

	/**
	 * Creates an Sarvam chat model for text generation.
	 *
	 * @example
	 * 	const { text } = await generateText({
	 * 		model: sarvam.languageModel("sarvam-30b"),
	 * 		prompt: "Translate this to malayalam: 'Keep cooking, guys'",
	 * 	});
	 */
	languageModel(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV3;

	/**
	 * Creates a Sarvam model for chat.
	 *
	 * @example
	 * 	const { text } = await generateText({
	 * 		model: sarvam.chat("sarvam-30b"),
	 * 		prompt: "Translate this to malayalam: 'Keep cooking, guys'",
	 * 	});
	 */
	chat(modelId: ChatModelId, settings?: ChatSettings): LanguageModelV3;

	/**
	 * Creates a Sarvam model for transcription.
	 *
	 * @example
	 * 	const { text } = await transcribe({
	 *		model: sarvam.transcription("saaras:v3"),
	 *		audio: await readFile("./audio.wav"),
	 * 	});
	 */
	transcription(
		modelId: TranscriptionModelId,
		/**
		 * Audio source language code.
		 * Use "unknown" for automatic language detection.
		 *
		 * @default "unknown"
		 */
		languageCode?: SarvamLanguageCode | MoreSarvamLanguageCode | "unknown",
		settings?: TranscriptionSettings,
	): TranscriptionModelV3;

	/**
	 * Creates a Sarvam model for speech.
	 * @example
	 *	const { audio } = await generateSpeech({
	 *		model: sarvam.speech("bulbul:v3", "ml-IN"),
	 *		text: "പാചകം തുടരൂ, സുഹൃത്തുക്കളേ",
	 * 	});
	 *
	 * 	await writeFile("./audio.wav", Buffer.from(audio.base64, "base64"));
	 */
	speech(
		modelId: SpeechModelId,
		languageCode: SarvamLanguageCode,
		settings?: SpeechSettings,
	): SpeechModelV3;

	/**
	 * Creates an Sarvam model for transliterate.
	 *
	 * @example
	 * 	const { text } = await generateText({
	 *		model: sarvam.transliterate({
	 *			to: "ml-IN",
	 *			from: "en-IN", // Optional
	 *		}),
	 *		prompt: "eda mone, happy alle?",
	 *	});
	 */
	transliterate<T extends SarvamLanguageCode>(
		settings: TransliterateSettings<false, T>,
	): LanguageModelV3;

	/**
	 * Creates an Sarvam model for translation.
	 *
	 * @example
	 * 	const { text } = await generateText({
	 *		model: sarvam.translation("mayura:v1", {
	 *			to: "en-IN",
	 *			from: "ml-IN", // Optional
	 *		}),
	 *		prompt: "ഇതൊക്കെ ശ്രദ്ധിക്കണ്ടേ അംബാനെ?",
	 *	});
	 */
	translation<T extends TranslationModelId>(
		model: T,
		settings: TranslationSettings<T>,
	): LanguageModelV3;

	/**
	 * Creates an Sarvam model for language identification.
	 *
	 * @example
	 * 	const { text } = await generateText({
	 *		model: sarvam.languageIdentification(),
	 *		prompt: "ബുദ്ധിയാണ് സാറേ ഇവൻ്റെ മെയിൻ",
	 *	});
	 */
	languageIdentification(): LanguageModelV3;

	/**
	 * Sarvam Vision Document Intelligence client.
	 * Digitizes documents (PDF, PNG, JPEG, ZIP) using OCR across 23 languages.
	 *
	 * @example
	 * 	const result = await sarvam.documentIntelligence.digitize(
	 * 		await readFile("./invoice.pdf"),
	 * 		"invoice.pdf",
	 * 		{ language: "hi-IN", outputFormat: "md" }
	 * 	);
	 * 	await writeFile("./output.zip", result.output);
	 */
	documentIntelligence: SarvamDocumentIntelligence;
};
