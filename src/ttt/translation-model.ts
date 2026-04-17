import type {
	LanguageModelV3,
	LanguageModelV3CallOptions,
	LanguageModelV3Content,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	parseProviderOptions,
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	type TranslationModelId,
	type TranslationSettings,
	translationResponseSchema,
	translationSettingsSchema,
} from "./translation-settings";
import { convertPromptToInput } from "./utils";

export class SarvamTranslationModel implements LanguageModelV3 {
	readonly specificationVersion = "v3";

	readonly modelId: TranslationModelId;
	readonly settings: TranslationSettings;

	private readonly config: SarvamConfig;

	constructor(
		modelId: TranslationModelId,
		settings: TranslationSettings,
		config: SarvamConfig,
	) {
		this.modelId = modelId;
		this.settings = settings;
		this.config = config;
	}

	get provider(): string {
		return this.config.provider;
	}

	get supportedUrls(): Record<string, RegExp[]> {
		return {};
	}

	private async getArgs(
		options: LanguageModelV3CallOptions & {
			stream: boolean;
		},
	) {
		const { prompt, providerOptions } = options;

		const sarvamOptions = await parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerOptions?.sarvam,
					...this.settings,
				},
			},
			schema: translationSettingsSchema,
		});

		if (!sarvamOptions) throw new Error("Translation Settings is not provided");

		const from = sarvamOptions.from ?? "auto";
		const to = sarvamOptions.to;

		if (from === to) {
			throw new Error("Source and target languages code must be different.");
		}

		if (this.modelId === "sarvam-translate:v1") {
			if ((sarvamOptions.mode ?? "formal") !== "formal")
				throw new Error(
					"Sarvam 'sarvam-translate:v1' only support mode formal.",
				);
			if (from === "auto")
				throw new Error(
					"Sarvam 'sarvam-translate:v1' requires source language code.",
				);
		}

		return {
			args: {
				input: convertPromptToInput(prompt),
				model: this.modelId,
				...sarvamOptions,
				source_language_code: from,
				target_language_code: to,
			},
			warnings: [],
		};
	}

	async doGenerate(
		options: LanguageModelV3CallOptions,
	): Promise<Awaited<ReturnType<LanguageModelV3["doGenerate"]>>> {
		const { args } = await this.getArgs({
			...options,
			stream: false,
		});

		const { value: response } = await postJsonToApi({
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

		const translatedText = response.translated_text ?? "";

		const content: LanguageModelV3Content[] = [
			{ type: "text", text: translatedText },
		];

		return {
			content,
			finishReason: { unified: "stop" as const, raw: undefined },
			usage: {
				inputTokens: {
					total: undefined,
					noCache: undefined,
					cacheRead: undefined,
					cacheWrite: undefined,
				},
				outputTokens: {
					total: undefined,
					text: undefined,
					reasoning: undefined,
				},
			},
			warnings: [],
		};
	}

	async doStream(
		_options: LanguageModelV3CallOptions,
	): Promise<Awaited<ReturnType<LanguageModelV3["doStream"]>>> {
		throw new Error("Translation feature doesn't support streaming yet");
	}
}
