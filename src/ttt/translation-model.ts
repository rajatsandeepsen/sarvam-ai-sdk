import type {
	LanguageModelV1,
	LanguageModelV1CallWarning,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import { convertToChatMessages } from "../chat/convert-to-chat-messages";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	type TranslationModelId,
	type TranslationSettings,
	translationResponseSchema,
} from "./translation-settings";

export class SarvamTranslationModel implements LanguageModelV1 {
	readonly specificationVersion = "v1";

	readonly supportsStructuredOutputs = false;
	readonly defaultObjectGenerationMode = "json";

	readonly modelId: TranslationModelId;
	readonly settings: TranslationSettings;

	private readonly config: SarvamConfig;

	constructor(
		modelId: TranslationModelId,
		settings: TranslationSettings,
		config: SarvamConfig,
	) {
		this.modelId = modelId ?? "mayura:v1";
		this.settings = settings;
		this.config = config;
	}

	get provider(): string {
		return this.config.provider;
	}

	get supportsImageUrls(): boolean {
		// image urls can be sent if downloadImages is disabled (default):
		return false;
	}

	private getArgs({
		mode,
		prompt,
	}: Parameters<LanguageModelV1["doGenerate"]>[0] & {
		stream: boolean;
	}) {
		const type = mode.type;

		const warnings: LanguageModelV1CallWarning[] = [];

		if (this.settings.from === this.settings.to) {
			throw new Error("Source and target languages code must be different.");
		}

		if (this.modelId === "sarvam-translate:v1") {
			if ((this.settings.mode ?? "formal") !== "formal")
				throw new Error(
					"Sarvam 'sarvam-translate:v1' only support mode formal.",
				);
			if ((this.settings.from ?? "auto") === "auto")
				throw new Error(
					"Sarvam 'sarvam-translate:v1' requires source language code.",
				);
		}

		if (type !== "regular") {
			const _exhaustiveCheck = type;
			throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
		}

		const messages = convertToChatMessages(prompt);

		return {
			messages,
			args: {
				input: messages
					.filter((m) => m.role === "user")
					.map((m) => m.content)
					.join("\n"),
				source_language_code: this.settings.from ?? "auto",
				target_language_code: this.settings.to,
				numerals_format: this.settings.numerals_format ?? "international",
				enable_preprocessing: this.settings.enable_preprocessing ?? false,
				output_script: this.settings.output_script ?? null,
				speaker_gender: this.settings.speaker_gender ?? "Male",
				mode: this.settings.mode ?? "formal",
				model: this.modelId,
			},
			warnings,
		};
	}

	async doGenerate(
		options: Parameters<LanguageModelV1["doGenerate"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
		const { args, warnings, messages } = this.getArgs({
			...options,
			stream: false,
		});

		const body = JSON.stringify(args);

		const {
			responseHeaders,
			value: response,
			rawValue: rawResponse,
		} = await postJsonToApi({
			url: this.config.url({
				path: "/translate",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers(), options.headers),
			body: args,
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(
				translationResponseSchema,
			),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const { input: rawPrompt, ...rawSettings } = args;

		const text = response.translated_text ?? undefined;

		return {
			text,
			toolCalls: undefined,
			reasoning: undefined,
			finishReason: "unknown",
			usage: {
				promptTokens: NaN,
				completionTokens: NaN,
			},
			rawCall: { rawPrompt, rawSettings },
			rawResponse: { headers: responseHeaders, body: rawResponse },
			response: undefined,
			warnings,
			request: { body },
		};
	}

	async doStream(
		options: Parameters<LanguageModelV1["doStream"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
		throw new Error("Translation feature doesn't support streaming yet");
	}
}
