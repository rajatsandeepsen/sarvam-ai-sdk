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
	type TransliterateSettings,
	transliterateResponseSchema,
	transliterateSettingsSchema,
} from "./transliterate-settings";
import { convertPromptToInput } from "./utils";

export class SarvamTransliterateModel implements LanguageModelV2 {
	readonly specificationVersion = "v2";

	readonly modelId: "unknown";
	readonly settings: TransliterateSettings;

	private readonly config: SarvamConfig;

	constructor(settings: TransliterateSettings, config: SarvamConfig) {
		this.modelId = "unknown";
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
			schema: transliterateSettingsSchema,
		}) as unknown as ReturnType<typeof transliterateSettingsSchema.parse>;

		if (!sarvamOptions)
			throw new Error("Transliterate Settings is not provided");

		const from = sarvamOptions.from ?? "auto";
		const to = sarvamOptions.to;

		if (from !== "auto") {
			if (to !== "en-IN" && from !== "en-IN")
				if (to !== from)
					throw new Error(
						"Sarvam doesn't support Indic-Indic Transliteration yet",
					);
		}

		return {
			args: {
				input: convertPromptToInput(prompt),
				...sarvamOptions,
				source_language_code: from,
				target_language_code: to,
				spoken_form_numerals_language: sarvamOptions.spoken_form
					? (sarvamOptions.spoken_form_numerals_language ?? "english")
					: undefined,
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
				path: "/transliterate",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers(), options.headers),
			body: args,
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(
				transliterateResponseSchema,
			),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const transliteratedText = response.transliterated_text ?? "unknown";

		const content: LanguageModelV2Content[] = [
			{ type: "text", text: transliteratedText },
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
		throw new Error("Transliterate feature doesn't support streaming yet");
	}
}
