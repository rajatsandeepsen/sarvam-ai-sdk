import type {
	LanguageModelV3,
	LanguageModelV3CallOptions,
	LanguageModelV3Content,
	LanguageModelV3FinishReason,
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

export class SarvamLidModel implements LanguageModelV3 {
	readonly specificationVersion = "v3";

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
		options: LanguageModelV3CallOptions & {
			stream: boolean;
		},
	) {
		const { prompt } = options;

		return {
			args: {
				input: convertPromptToInput(prompt),
			},
			warnings: [],
		};
	}

	async doGenerate(
		options: LanguageModelV3CallOptions,
	): Promise<Awaited<ReturnType<LanguageModelV3["doGenerate"]>>> {
		const { args } = this.getArgs({
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

		const content: LanguageModelV3Content[] = [
			{ type: "text", text: languageCode ?? "unknown" },
		];

		return {
			content,
			finishReason: "stop" as unknown as LanguageModelV3FinishReason,
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
		throw new Error(
			"Language Identification feature doesn't support streaming yet",
		);
	}
}
