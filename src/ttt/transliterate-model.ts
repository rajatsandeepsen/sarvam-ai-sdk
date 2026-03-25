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
	type TransliterateSettings,
	transliterateResponseSchema,
	transliterateSettingsSchema,
} from "./transliterate-settings";
import { convertPromptToInput } from "./utils";

export class SarvamTransliterateModel implements LanguageModelV1 {
	readonly specificationVersion = "v1";

	readonly supportsStructuredOutputs = false;
	readonly defaultObjectGenerationMode = "json";

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
			schema: transliterateSettingsSchema,
		});

		if (!sarvamOptions)
			throw new Error("Transliterate Settings is not provided");

		if (sarvamOptions.from !== "auto") {
			if (sarvamOptions.to !== "en-IN" && sarvamOptions.from !== "en-IN")
				if (sarvamOptions.to !== sarvamOptions.from)
					throw new Error(
						"Sarvam doesn't support Indic-Indic Transliteration yet",
					);
		}

		return {
			args: {
				input: convertPromptToInput(prompt),
				...sarvamOptions,
				source_language_code: sarvamOptions.from ?? "auto",
				target_language_code: sarvamOptions.to,
				spoken_form_numerals_language: sarvamOptions.spoken_form
					? (sarvamOptions.spoken_form_numerals_language ?? "english")
					: undefined,
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

		const { input: rawPrompt, ...rawSettings } = args;

		const text = response.transliterated_text ?? undefined;

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
		throw new Error("Transliterate feature doesn't streaming yet");
	}
}
