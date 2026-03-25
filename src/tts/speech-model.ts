import type { SpeechModelV1, SpeechModelV1CallWarning } from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	parseProviderOptions,
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import {
	type SarvamConfig,
	type SarvamLanguageCode,
	SarvamLanguageCodeSchema,
} from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	SarvamProviderOptionsSchema,
	type SpeechModelId,
	type SpeechSettings,
	sarvamSpeechResponseSchema,
} from "./speech-settings";

interface SpeechModelConfig extends SarvamConfig {
	_internal?: {
		currentDate?: () => Date;
	};
	speech?: SpeechSettings;
}

export class SarvamSpeechModel implements SpeechModelV1 {
	readonly specificationVersion = "v1";

	get provider(): string {
		return this.config.provider;
	}

	constructor(
		readonly modelId: SpeechModelId,
		readonly languageCode: SarvamLanguageCode,
		private readonly config: SpeechModelConfig,
	) {}

	private getArgs({
		text,
		voice,
		outputFormat = "wav",
		speed,
		providerOptions,
	}: Parameters<SpeechModelV1["doGenerate"]>[0]) {
		const warnings: SpeechModelV1CallWarning[] = [];

		// Parse provider options
		const sarvamOptions = parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					speaker: voice,
					pace: speed,
					output_audio_codec: outputFormat,
					...providerOptions?.sarvam,
					...this.config.speech,
				},
			},
			schema: SarvamProviderOptionsSchema,
		});

		// Required request body
		const requestBody: Record<string, unknown> = {
			model: this.modelId,
			text,
			target_language_code: SarvamLanguageCodeSchema.parse(this.languageCode),
		};

		// Optional provider-specific options
		if (sarvamOptions) {
			Object.entries(sarvamOptions).forEach(([key, value]) => {
				if (value !== undefined) {
					requestBody[key] = value;
				}
			});
		}

		return {
			requestBody,
			warnings,
		};
	}

	async doGenerate(
		options: Parameters<SpeechModelV1["doGenerate"]>[0],
	): Promise<Awaited<ReturnType<SpeechModelV1["doGenerate"]>>> {
		const currentDate = this.config._internal?.currentDate?.() ?? new Date();
		const { requestBody, warnings } = this.getArgs(options);

		const {
			value,
			responseHeaders,
			rawValue: rawResponse,
		} = await postJsonToApi({
			url: this.config.url({
				path: "/text-to-speech",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers(), options.headers),
			body: requestBody,
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(
				sarvamSpeechResponseSchema,
			),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const audio = value.audios[0];

		return {
			audio,
			warnings,
			request: {
				body: JSON.stringify(requestBody),
			},
			response: {
				timestamp: currentDate,
				modelId: this.modelId,
				headers: responseHeaders,
				body: rawResponse,
			},
		};
	}
}
