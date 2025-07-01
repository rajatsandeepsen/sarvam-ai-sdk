import type {
    TranscriptionModelV2,
    TranscriptionModelV2CallWarning,
} from "@ai-sdk/provider";
import {
    combineHeaders,
    createJsonResponseHandler,
    parseProviderOptions,
    postFormDataToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import type { SarvamConfig, SarvamLanguageCode } from "./sarvam-config";
import { sarvamFailedResponseHandler } from "./sarvam-error";
import {
    SarvamProviderOptionsSchema,
    type SarvamTranscriptionCallOptions,
    type SarvamTranscriptionModelId,
} from "./sarvam-transcription-settings";

// https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
interface SarvamTranscriptionModelConfig extends SarvamConfig {
    _internal?: {
        currentDate?: () => Date;
    };
    transcription?: SarvamTranscriptionCallOptions;
}

export class SarvamTranscriptionModel implements TranscriptionModelV2 {
    readonly specificationVersion = "v2";

    constructor(
        readonly modelId: SarvamTranscriptionModelId,
        readonly languageCode: SarvamLanguageCode | "unknown",
        private readonly config: SarvamTranscriptionModelConfig,
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

        if (this.modelId === "saarika:v1" && this.languageCode === "unknown")
            throw new Error(
                "Language code unknown is not supported for model saarika:v1",
            );

        const sarvamOptions = parseProviderOptions({
            provider: "sarvam",
            providerOptions: {
                sarvam: {
                    ...providerOptions?.sarvam,
                    ...this.config.transcription,
                },
            },
            schema: SarvamProviderOptionsSchema,
        });

        const formData = new FormData();
        const blob =
            audio instanceof Blob
                ? audio
                : new Blob([audio], { type: mediaType });

        formData.append("file", blob);
        formData.append("model", this.modelId);
        if (sarvamOptions) {
            formData.append("language_code", this.languageCode);
            formData.append(
                "with_timestamps",
                sarvamOptions.with_timestamps ? "true" : "false",
            );
            formData.append(
                "with_diarization",
                sarvamOptions.with_diarization ? "true" : "false",
            );
            if (
                sarvamOptions.num_speakers !== null &&
                sarvamOptions.num_speakers !== undefined
            ) {
                formData.append(
                    "num_speakers",
                    sarvamOptions.num_speakers.toString(),
                );
            }
        }

        return {
            formData,
            warnings,
        };
    }

    async doGenerate(
        options: Parameters<TranscriptionModelV2["doGenerate"]>[0],
    ): Promise<Awaited<ReturnType<TranscriptionModelV2["doGenerate"]>>> {
        const currentDate =
            this.config._internal?.currentDate?.() ?? new Date();
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
                sarvamTranscriptionResponseSchema,
            ),
            abortSignal: options.abortSignal,
            fetch: this.config.fetch,
        });

        return {
            text: response.transcript,
            segments: response.timestamps
                ? response.timestamps.words.map((word, index) => ({
                      text: word,
                      startSecond:
                          response.timestamps!.start_time_seconds[index],
                      endSecond: response.timestamps!.end_time_seconds[index],
                  }))
                : [],
            language: response.language_code
                ? response.language_code
                : undefined,
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

const sarvamTranscriptionResponseSchema = z.object({
    request_id: z.string().nullable(),
    transcript: z.string(),
    language_code: z.string().nullable(),
    timestamps: z
        .object({
            end_time_seconds: z.array(z.number()),
            start_time_seconds: z.array(z.number()),
            words: z.array(z.string()),
        })
        .optional(),
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
        .optional(),
});
