import type {
	TranscriptionModelV1,
	TranscriptionModelV1CallWarning,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	postFormDataToApi,
} from "@ai-sdk/provider-utils";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	type SpeechTranslationModelId,
	speechTranslationResponseSchema,
} from "./speech-translation-settings";

// https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
interface SpeechTranslationModelConfig extends SarvamConfig {
	_internal?: {
		currentDate?: () => Date;
	};
}

export class SarvamSpeechTranslationModel implements TranscriptionModelV1 {
	readonly specificationVersion = "v1";

	constructor(
		readonly modelId: SpeechTranslationModelId,
		private readonly config: SpeechTranslationModelConfig,
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

		const formData = new FormData();
		const blob =
			audio instanceof Blob ? audio : new Blob([audio], { type: mediaType });

		formData.append("file", blob);
		formData.append("model", this.modelId);

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
				path: "/speech-to-text-translate",
				modelId: this.modelId,
			}),
			headers: combineHeaders(this.config.headers(), options.headers),
			formData,
			failedResponseHandler: sarvamFailedResponseHandler,
			successfulResponseHandler: createJsonResponseHandler(
				speechTranslationResponseSchema,
			),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		return {
			text: response.transcript,
			segments: [],
			language: response.language_code ? response.language_code : undefined,
			durationInSeconds: undefined,
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
