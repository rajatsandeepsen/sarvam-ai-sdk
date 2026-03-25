import type {
	LanguageModelV1,
	LanguageModelV1CallWarning,
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
		this.modelId = modelId;
		this.settings = settings;
		this.config = config;
	}

	get provider(): string {
		return this.config.provider;
	}

	get supportsImageUrls(): boolean {
		return false;
	}

	private getArgs({
		mode,
		prompt,
		providerMetadata,
	}: Parameters<LanguageModelV1["doGenerate"]>[0] & {
		stream: boolean;
	}) {
		const type = mode.type;

		const warnings: LanguageModelV1CallWarning[] = [];

		if (type !== "regular") {
			const _exhaustiveCheck = type;
			throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
		}

		const sarvamOptions = parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerMetadata?.sarvam,
					...this.settings,
				},
			},
			schema: translationSettingsSchema,
		});

		if (!sarvamOptions) throw new Error("Translation Settings is not provided");

		if (sarvamOptions.from === sarvamOptions.to) {
			throw new Error("Source and target languages code must be different.");
		}

		if (this.modelId === "sarvam-translate:v1") {
			if ((sarvamOptions.mode ?? "formal") !== "formal")
				throw new Error(
					"Sarvam 'sarvam-translate:v1' only support mode formal.",
				);
			if (sarvamOptions.from === "auto")
				throw new Error(
					"Sarvam 'sarvam-translate:v1' requires source language code.",
				);
		}

		return {
			args: {
				input: convertPromptToInput(prompt),
				model: this.modelId,
				...sarvamOptions,
				source_language_code: sarvamOptions.from ?? "auto",
				target_language_code: sarvamOptions.to,
			},
			warnings,
		};
	}

	async doGenerate(
		options: Parameters<LanguageModelV1["doGenerate"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
		const { args, warnings } = this.getArgs({
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
