import type {
	LanguageModelV1,
	LanguageModelV1CallWarning,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	sarvamTransliterateResponseSchema,
	type TransliterateSettings,
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
	}: Parameters<LanguageModelV1["doGenerate"]>[0] & {
		stream: boolean;
	}) {
		const type = mode.type;

		const warnings: LanguageModelV1CallWarning[] = [];

		if (this.settings.from !== "auto") {
			if (this.settings.to !== "en-IN" && this.settings.from !== "en-IN")
				throw new Error(
					"Sarvam doesn't support Indic-Indic Transliteration yet",
				);
		}

		if (type !== "regular") {
			const _exhaustiveCheck = type;
			throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
		}

		return {
			args: {
				input: convertPromptToInput(prompt),
				source_language_code: this.settings.from ?? "auto",
				target_language_code: this.settings.to,
				numerals_format: this.settings.numerals_format,
				...(this.settings.spoken_form
					? {
							spoken_form: this.settings.spoken_form,
							spoken_form_numerals_language:
								this.settings.spoken_form_numerals_language ?? "english",
						}
					: {}),
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
				sarvamTransliterateResponseSchema,
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
