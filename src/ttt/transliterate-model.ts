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
	type TransliterateSettings,
	transliterateResponseSchema,
	transliterateSettingsSchema,
} from "./transliterate-settings";
import { convertPromptToInput } from "./utils";

export class SarvamTransliterateModel implements LanguageModelV3 {
	readonly specificationVersion = "v3";

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
			schema: transliterateSettingsSchema,
		});

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

		const transliteratedText = response.transliterated_text ?? "";

		const content: LanguageModelV3Content[] = [
			{ type: "text", text: transliteratedText },
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
		throw new Error("Transliterate feature doesn't support streaming yet");
	}
}
