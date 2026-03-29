import type {
	TranscriptionModelV2,
	TranscriptionModelV2CallOptions,
	TranscriptionModelV2CallWarning,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	parseProviderOptions,
	postFormDataToApi,
} from "@ai-sdk/provider-utils";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	type SpeechTranslationModelId,
	type SpeechTranslationSettings,
	speechTranslationResponseSchema,
	speechTranslationSettingsSchema,
} from "./speech-translation-settings";

// https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
interface SpeechTranslationModelConfig extends SarvamConfig {
	_internal?: {
		currentDate?: () => Date;
	};
	speechTranslation?: SpeechTranslationSettings;
}

export class SarvamSpeechTranslationModel implements TranscriptionModelV2 {
	readonly specificationVersion = "v2";

	constructor(
		readonly modelId: SpeechTranslationModelId,
		private readonly config: SpeechTranslationModelConfig,
	) {}

	get provider(): string {
		return this.config.provider;
	}

	get supportedUrls(): Record<string, RegExp[]> {
		return {};
	}

	private getArgs(
		options: TranscriptionModelV2CallOptions & { stream: boolean },
	) {
		const { audio, mediaType, providerOptions } = options;
		const warnings: TranscriptionModelV2CallWarning[] = [];

		const sarvamOptions = parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerOptions?.sarvam,
					...this.config.speechTranslation,
				},
			},
			schema: speechTranslationSettingsSchema,
		});

		const formData = new FormData();
		const blob =
			audio instanceof Blob ? audio : new Blob([audio], { type: mediaType });

		formData.append("file", blob);
		formData.append("model", this.modelId);

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
		options: TranscriptionModelV2CallOptions,
	): Promise<Awaited<ReturnType<TranscriptionModelV2["doGenerate"]>>> {
		const currentDate = this.config._internal?.currentDate?.() ?? new Date();
		const { formData, warnings } = this.getArgs({
			...options,
			stream: false,
		});

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
			segments:
				response.diarized_transcript?.entries.map((e) => ({
					text: e.transcript,
					endSecond: e.end_time_seconds,
					startSecond: e.start_time_seconds,
					speakerId: e.speaker_id,
				})) ?? [],
			language: response.language_code ?? undefined,
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
