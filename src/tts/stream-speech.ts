import type {
	SharedV3ProviderOptions,
	SharedV3Warning,
} from "@ai-sdk/provider";
import type { SarvamSpeechModel, SarvamSpeechStreamResult } from "./speech-model";

export type StreamSpeechOptions = {
	/**
	 * Sarvam speech model — created via `sarvam.speech(modelId, languageCode, settings?)`.
	 */
	model: SarvamSpeechModel;

	/**
	 * The text to convert to speech.
	 */
	text: string;

	/**
	 * The speaker voice to use. Equivalent to `providerOptions.sarvam.speaker`.
	 */
	voice?: string;

	/**
	 * The desired output audio codec — `"mp3"`, `"wav"`, `"opus"`, etc.
	 */
	outputFormat?: "mp3" | "wav" | (string & {});

	/**
	 * Speech pace. Range: `0.5 - 2.0`. Equivalent to `providerOptions.sarvam.pace`.
	 */
	speed?: number;

	/**
	 * Provider-specific options. Anything under `providerOptions.sarvam` is forwarded
	 * to the streaming endpoint (speaker, pitch, loudness, sample_rate, temperature, …).
	 */
	providerOptions?: SharedV3ProviderOptions;

	/**
	 * Optional abort signal — cancels the stream and the underlying request.
	 */
	abortSignal?: AbortSignal;

	/**
	 * Additional HTTP headers to attach to the request.
	 */
	headers?: Record<string, string>;
};

export type StreamSpeechResult = {
	/**
	 * The streaming audio bytes. Pipe straight into a `Response` body or a file sink.
	 */
	audioStream: ReadableStream<Uint8Array>;
	/**
	 * MIME type reported by Sarvam (e.g. `"audio/mpeg"`, `"audio/wav"`). Use this
	 * as the `Content-Type` when forwarding the stream to a browser.
	 */
	contentType?: string;
	/**
	 * Warnings for the call (e.g. unsupported settings).
	 */
	warnings: Array<SharedV3Warning>;
	/**
	 * Provider-specific metadata, including `sarvam.request_id` when available.
	 */
	providerMetadata: { sarvam: { request_id?: string } };
	/**
	 * Request information for telemetry and debugging.
	 */
	request: { body: Record<string, unknown> };
	/**
	 * Response metadata for telemetry and debugging.
	 */
	response: {
		timestamp: Date;
		modelId: string;
		headers: Record<string, string>;
		status: number;
	};
};

/**
 * Streams speech audio from text using a Sarvam speech model.
 *
 * Mirrors the call shape of AI SDK's `experimental_generateSpeech`, but returns
 * a `ReadableStream<Uint8Array>` of audio bytes instead of a buffered `audio` object.
 *
 * @example
 * ```ts
 * import { sarvam, streamSpeech } from "sarvam-ai-sdk";
 *
 * export async function POST(req: Request) {
 *   const { text } = await req.json();
 *   const { audioStream, contentType } = await streamSpeech({
 *     model: sarvam.speech("bulbul:v3", "en-IN"),
 *     text,
 *     voice: "aayan",
 *     outputFormat: "mp3",
 *   });
 *   return new Response(audioStream, {
 *     headers: { "content-type": contentType ?? "audio/mpeg" },
 *   });
 * }
 * ```
 */
export async function streamSpeech(
	options: StreamSpeechOptions,
): Promise<StreamSpeechResult> {
	const {
		model,
		text,
		voice,
		outputFormat,
		speed,
		providerOptions,
		abortSignal,
		headers,
	} = options;

	const result: SarvamSpeechStreamResult = await model.doStream({
		text,
		voice,
		outputFormat,
		speed,
		providerOptions,
		abortSignal,
		headers,
	});

	return {
		audioStream: result.audioStream,
		contentType: result.contentType,
		warnings: result.warnings,
		providerMetadata: result.providerMetadata,
		request: result.request,
		response: result.response,
	};
}
