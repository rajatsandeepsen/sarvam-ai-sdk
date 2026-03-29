import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
	LanguageModelV2CallWarning,
	LanguageModelV2Content,
	LanguageModelV2FinishReason,
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

export class SarvamTranslationModel implements LanguageModelV2 {
	readonly specificationVersion = "v2";

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

	private getArgs(
		options: LanguageModelV2CallOptions & {
			stream: boolean;
		},
	) {
		const { prompt, providerOptions } = options;

		const warnings: LanguageModelV2CallWarning[] = [];

		const sarvamOptions = parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerOptions?.sarvam,
					...this.settings,
				},
			},
			schema: translationSettingsSchema,
		}) as unknown as ReturnType<typeof translationSettingsSchema.parse>;

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
			warnings,
		};
	}

	async doGenerate(
		options: LanguageModelV2CallOptions,
	): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
		const { args, warnings } = this.getArgs({
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

		const translatedText = response.translated_text ?? "unknown";

		const content: LanguageModelV2Content[] = [
			{ type: "text", text: translatedText },
		];

		return {
			content,
			finishReason: "stop" as LanguageModelV2FinishReason,
			usage: {
				inputTokens: NaN,
				outputTokens: NaN,
				totalTokens: NaN,
			},
			warnings,
		};
	}

	async doStream(
		_options: LanguageModelV2CallOptions,
	): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
		throw new Error("Translation feature doesn't support streaming yet");
	}
}
