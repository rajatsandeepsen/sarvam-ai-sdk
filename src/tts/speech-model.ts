import {
	APICallError,
	type SharedV3Warning,
	type SpeechModelV3,
	type SpeechModelV3CallOptions,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createJsonResponseHandler,
	extractResponseHeaders,
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
	type SpeechModelId,
	type SpeechSettings,
	speechOptionsSchema,
	speechResponseSchema,
} from "./speech-settings";

interface SpeechModelConfig extends SarvamConfig {
	_internal?: {
		currentDate?: () => Date;
	};
	speech?: SpeechSettings;
}

export type SarvamSpeechStreamResult = {
	audioStream: ReadableStream<Uint8Array>;
	warnings: Array<SharedV3Warning>;
	contentType?: string;
	providerMetadata: {
		sarvam: {
			request_id?: string;
		};
	};
	request: {
		body: Record<string, unknown>;
	};
	response: {
		timestamp: Date;
		modelId: string;
		headers: Record<string, string>;
		status: number;
	};
};

export class SarvamSpeechModel implements SpeechModelV3 {
	readonly specificationVersion = "v3";

	get provider(): string {
		return this.config.provider;
	}

	get supportedUrls(): Record<string, RegExp[]> {
		return {};
	}

	constructor(
		readonly modelId: SpeechModelId,
		readonly languageCode: SarvamLanguageCode,
		private readonly config: SpeechModelConfig,
	) {}

	private async getArgs(
		options: SpeechModelV3CallOptions & { stream: boolean },
	) {
		const {
			text,
			voice,
			outputFormat = "wav",
			speed,
			providerOptions,
		} = options;

		// Parse provider options
		const sarvamOptions = await parseProviderOptions({
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
			schema: speechOptionsSchema,
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
				if (value !== undefined && value !== null) {
					requestBody[key] = value;
				}
			});
		}

		return {
			requestBody,
			warnings: [],
		};
	}

	async doGenerate(
		options: SpeechModelV3CallOptions,
	): Promise<Awaited<ReturnType<SpeechModelV3["doGenerate"]>>> {
		const currentDate = this.config._internal?.currentDate?.() ?? new Date();
		const { requestBody, warnings } = await this.getArgs({
			...options,
			stream: false,
		});

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
			successfulResponseHandler:
				createJsonResponseHandler(speechResponseSchema),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const audio = value.audios[0];

		if (audio == null) {
			throw new Error("No audio returned in response");
		}

		return {
			audio,
			warnings,
			providerMetadata: {
				sarvam: {
					request_id: value.request_id,
				},
			},
			request: {
				body: requestBody,
			},
			response: {
				timestamp: currentDate,
				modelId: this.modelId,
				headers: responseHeaders,
				body: rawResponse,
			},
		};
	}

	/**
	 * Provider-specific streaming TTS — does NOT satisfy `SpeechModelV3` and is
	 * not callable via `experimental_generateSpeech`. Hits Sarvam's REST stream
	 * endpoint (`POST /text-to-speech/stream`) and returns a `ReadableStream` of
	 * raw audio bytes, ready to pipe into a `Response` body.
	 *
	 * @example
	 * ```ts
	 * const { audioStream, contentType } =
	 *   await sarvam.speech("bulbul:v3", "en-IN").doStream({ text: "..." });
	 * return new Response(audioStream, {
	 *   headers: { "content-type": contentType ?? "audio/mpeg" },
	 * });
	 * ```
	 */
	async doStream(
		options: SpeechModelV3CallOptions,
	): Promise<SarvamSpeechStreamResult> {
		const currentDate = this.config._internal?.currentDate?.() ?? new Date();
		const { requestBody, warnings } = await this.getArgs({
			...options,
			stream: true,
		});

		const url = this.config.url({
			path: "/text-to-speech/stream",
			modelId: this.modelId,
		});

		const fetchImpl = this.config.fetch ?? globalThis.fetch;
		const headers: Record<string, string> = {
			"content-type": "application/json",
			accept: "application/octet-stream",
		};
		for (const [k, v] of Object.entries(
			combineHeaders(this.config.headers(), options.headers),
		)) {
			if (typeof v === "string") headers[k] = v;
		}

		let httpResponse: Response;
		try {
			httpResponse = await fetchImpl(url, {
				method: "POST",
				headers,
				body: JSON.stringify(requestBody),
				signal: options.abortSignal,
			});
		} catch (err) {
			throw new APICallError({
				message: `Failed to open Sarvam streaming TTS: ${(err as Error).message}`,
				url,
				requestBodyValues: requestBody,
				cause: err,
			});
		}

		const responseHeaders = extractResponseHeaders(httpResponse);

		if (!httpResponse.ok) {
			const text = await httpResponse.text().catch(() => "");
			throw new APICallError({
				message: `Sarvam streaming TTS failed (${httpResponse.status}): ${text || httpResponse.statusText}`,
				url,
				requestBodyValues: requestBody,
				statusCode: httpResponse.status,
				responseHeaders,
				responseBody: text,
			});
		}

		if (!httpResponse.body) {
			throw new APICallError({
				message: "Sarvam streaming TTS returned no response body",
				url,
				requestBodyValues: requestBody,
				statusCode: httpResponse.status,
				responseHeaders,
			});
		}

		return {
			audioStream: httpResponse.body,
			warnings,
			contentType: responseHeaders["content-type"],
			providerMetadata: {
				sarvam: {
					request_id:
						responseHeaders["x-request-id"] ?? responseHeaders["request-id"],
				},
			},
			request: {
				body: requestBody,
			},
			response: {
				timestamp: currentDate,
				modelId: this.modelId,
				headers: responseHeaders,
				status: httpResponse.status,
			},
		};
	}
}
