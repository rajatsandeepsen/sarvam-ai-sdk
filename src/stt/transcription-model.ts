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
import z from "zod";
import {
	type MoreSarvamLanguageCode,
	MoreSarvamLanguageCodeSchema,
	type SarvamConfig,
	type SarvamLanguageCode,
	SarvamLanguageCodeSchema,
} from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	type TranscriptionModelId,
	type TranscriptionSettings,
	transcriptionProviderOptionsSchema,
	transcriptionResponseSchema,
} from "./transcription-settings";

// https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
interface TranscriptionModelConfig extends SarvamConfig {
	_internal?: {
		currentDate?: () => Date;
	};
	transcription?: TranscriptionSettings;
}

export class SarvamTranscriptionModel implements TranscriptionModelV1 {
	readonly specificationVersion = "v1";

	constructor(
		readonly modelId: TranscriptionModelId,
		readonly languageCode:
			| SarvamLanguageCode
			| MoreSarvamLanguageCode
			| "unknown",
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

		// Required parameters
		formData.append("model", this.modelId);
		formData.append(
			"language_code",
			z
				.union([
					SarvamLanguageCodeSchema,
					MoreSarvamLanguageCodeSchema,
					z.literal("unknown"),
				])
				.parse(this.languageCode),
		);

		const blob =
			audio instanceof Blob ? audio : new Blob([audio], { type: mediaType });
		formData.append("file", blob);

		// Optional provider-specific options
		if (sarvamOptions) {
			Object.entries(sarvamOptions).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
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
			segments:
				response.diarized_transcript?.entries.map((e) => ({
					text: e.transcript,
					speakerId: e.speaker_id,
					startSecond: e.start_time_seconds,
					endSecond: e.end_time_seconds,
				})) ?? [],
			language: response.language_code ?? undefined,
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
