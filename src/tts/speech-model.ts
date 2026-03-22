import type { SpeechModelV1, SpeechModelV1CallWarning } from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	parseProviderOptions,
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import type { SarvamConfig, SarvamLanguageCode } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import {
	outputAudioCodecSchema,
	SarvamProviderOptionsSchema,
	type SarvamSpeechModelId,
	type SarvamSpeechSettings,
	SpeakerSchema,
} from "./speech-settings";

interface SarvamSpeechModelConfig extends SarvamConfig {
	_internal?: {
		currentDate?: () => Date;
	};
	speech?: SarvamSpeechSettings;
}

export class SarvamSpeechModel implements SpeechModelV1 {
	readonly specificationVersion = "v1";

	get provider(): string {
		return this.config.provider;
	}

	constructor(
		readonly modelId: SarvamSpeechModelId,
		readonly languageCode: SarvamLanguageCode,
		private readonly config: SarvamSpeechModelConfig,
	) {}

	private getArgs({
		text,
		voice,
		outputFormat = "wav",
		speed,
		// instructions,
		providerOptions,
	}: Parameters<SpeechModelV1["doGenerate"]>[0]) {
		const warnings: SpeechModelV1CallWarning[] = [];

		// Parse provider options
		const sarvamOptions = parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerOptions?.sarvam,
					...this.config.speech,
				},
			},
			schema: SarvamProviderOptionsSchema,
		});

		const getSpeaker = (): SarvamSpeechSettings["speaker"] => {
			if (voice) {
				return SpeakerSchema.parse(voice);
			}

			switch (this.modelId) {
				case "bulbul:v2":
					return "manisha";
				case "bulbul:v3":
					return "shubh";
			}

			return "shubh";
		};

		// Create request body
		const requestBody: Record<string, unknown> = {
			model: this.modelId,
			text: text,
			target_language_code: this.languageCode,
			speaker: getSpeaker(),
			pace: speed,
		};

		if (outputFormat) {
			const of = outputAudioCodecSchema.safeParse(outputFormat);
			if (of.success) {
				requestBody.output_audio_codec = of.data;
			} else {
				warnings.push({
					type: "unsupported-setting",
					setting: "outputFormat",
					details: `Unsupported output format: ${outputFormat}. Using wav instead.`,
				});
			}
		}

		// Add provider-specific options
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
				z.object({
					request_id: z.string(),
					audios: z.array(z.string()),
				}),
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
