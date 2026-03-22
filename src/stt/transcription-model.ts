import type {
	TranscriptionModelV1,
	TranscriptionModelV1CallWarning,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	parseProviderOptions,
	postFormDataToApi,
} from "@ai-sdk/provider-utils";
import type { SarvamConfig, SarvamLanguageCode } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	type TranscriptionCallOptions,
	type TranscriptionModelId,
	transcriptionProviderOptionsSchema,
	transcriptionResponseSchema,
} from "./transcription-settings";

// https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
interface TranscriptionModelConfig extends SarvamConfig {
	_internal?: {
		currentDate?: () => Date;
	};
	transcription?: TranscriptionCallOptions;
}

export class SarvamTranscriptionModel implements TranscriptionModelV1 {
	readonly specificationVersion = "v1";

	constructor(
		readonly modelId: TranscriptionModelId,
		readonly languageCode: SarvamLanguageCode | "unknown",
		private readonly config: TranscriptionModelConfig,
	) {}

	get provider(): string {
		return this.config.provider;
	}

	private getArgs({
		audio,
		mediaType,
		providerOptions,
	}: Parameters<TranscriptionModelV1["doGenerate"]>[0]) {
		const warnings: TranscriptionModelV1CallWarning[] = [];

		const sarvamOptions = parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerOptions?.sarvam,
					...this.config.transcription,
				},
			},
			schema: transcriptionProviderOptionsSchema,
		});

		const formData = new FormData();
		const blob =
			audio instanceof Blob ? audio : new Blob([audio], { type: mediaType });

		formData.append("file", blob);
		formData.append("model", this.modelId);
		formData.append("language_code", this.languageCode);

		// Add provider-specific options
		if (sarvamOptions) {
			Object.entries(sarvamOptions).forEach(([key, value]) => {
				if (value) {
					formData.append(key, String(value));
				}
			});
		}

		return {
			formData,
			warnings,
		};
	}

	async doGenerate(
		options: Parameters<TranscriptionModelV1["doGenerate"]>[0],
	): Promise<Awaited<ReturnType<TranscriptionModelV1["doGenerate"]>>> {
		const currentDate = this.config._internal?.currentDate?.() ?? new Date();
		const { formData, warnings } = this.getArgs(options);

		const {
			value: response,
			responseHeaders,
			rawValue: rawResponse,
		} = await postFormDataToApi({
			url: this.config.url({
				path: "/speech-to-text",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers(), options.headers),
			formData,
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(
				transcriptionResponseSchema,
			),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		return {
			text: response.transcript,
			segments: response.timestamps
				? response.timestamps.words.map((word, index) => ({
						text: word,
						startSecond: response.timestamps!.start_time_seconds[index],
						endSecond: response.timestamps!.end_time_seconds[index],
					}))
				: [],
			language: response.language_code ? response.language_code : undefined,
			durationInSeconds:
				response.timestamps?.end_time_seconds[
					response.timestamps.end_time_seconds.length - 1
				] ?? undefined,
			warnings,
			response: {
				timestamp: currentDate,
				modelId: this.modelId,
				headers: responseHeaders,
				body: rawResponse,
			},
		};
	}
}
