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
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import { sarvamLidResponseSchema } from "./lid-settings";
import { convertPromptToInput } from "./utils";

export class SarvamLidModel implements LanguageModelV2 {
	readonly specificationVersion = "v2";

	readonly modelId: "unknown";

	private readonly config: SarvamConfig;

	constructor(config: SarvamConfig) {
		this.modelId = "unknown";
		this.config = config;
	}

	get provider(): string {
		return this.config.provider;
	}

	get supportedUrls(): Record<string, RegExp[]> {
		// Sarvam models don't have native URL support for content
		return {};
	}

	private getArgs(
		options: LanguageModelV2CallOptions & {
			stream: boolean;
		},
	) {
		const { prompt } = options;

		const warnings: LanguageModelV2CallWarning[] = [];

		return {
			args: {
				input: convertPromptToInput(prompt),
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
				path: "/text-lid",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers(), options.headers),
			body: args,
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(
				sarvamLidResponseSchema,
			),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const languageCode = response.language_code ?? undefined;

		const content: LanguageModelV2Content[] = [
			{ type: "text", text: languageCode ?? "unknown" },
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
		throw new Error(
			"Language Identification feature doesn't support streaming yet",
		);
	}
}
