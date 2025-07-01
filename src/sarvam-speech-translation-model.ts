import type {
  TranscriptionModelV2,
  TranscriptionModelV2CallWarning,
} from "@ai-sdk/provider";
import {
  combineHeaders,
  createJsonResponseHandler,
  postFormDataToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import type { SarvamConfig } from "./sarvam-config";
import { sarvamFailedResponseHandler } from "./sarvam-error";
import type { SarvamSpeechTranslationModelId } from "./sarvam-transcription-settings";

// https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
interface SarvamSpeechTranslationModelConfig extends SarvamConfig {
  _internal?: {
    currentDate?: () => Date;
  };
}

export class SarvamSpeechTranslationModel implements TranscriptionModelV2 {
  readonly specificationVersion = "v2";

  constructor(
    readonly modelId: SarvamSpeechTranslationModelId,
    private readonly config: SarvamSpeechTranslationModelConfig,
  ) {}

  get provider(): string {
    return this.config.provider;
  }

  private getArgs({
    audio,
    mediaType,
    providerOptions,
  }: Parameters<TranscriptionModelV2["doGenerate"]>[0]) {
    const warnings: TranscriptionModelV2CallWarning[] = [];

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
    options: Parameters<TranscriptionModelV2["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<TranscriptionModelV2["doGenerate"]>>> {
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
        sarvamTranscriptionResponseSchema,
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

const sarvamTranscriptionResponseSchema = z.object({
  request_id: z.string().nullable(),
  transcript: z.string(),
  language_code: z.string().nullable(),
  // timestamps: z
  //   .object({
  //     end_time_seconds: z.array(z.number()),
  //     start_time_seconds: z.array(z.number()),
  //     words: z.array(z.string()),
  //   })
  //   .optional(),
  diarized_transcript: z
    .object({
      entries: z.array(
        z.object({
          end_time_seconds: z.array(z.number()),
          start_time_seconds: z.array(z.number()),
          transcript: z.string(),
          speaker_id: z.string(),
        }),
      ),
    })
    .nullable()
    .optional(),
});
