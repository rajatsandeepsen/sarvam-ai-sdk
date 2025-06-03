import type { SpeechModelV1, SpeechModelV1CallWarning } from "@ai-sdk/provider";
import {
    combineHeaders,
    createBinaryResponseHandler,
    createJsonResponseHandler,
    parseProviderOptions,
    postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { SarvamConfig, SarvamLanguageCode } from "./sarvam-config";
import { sarvamFailedResponseHandler } from "./sarvam-error";
import {
    SarvamProviderOptionsSchema,
    SarvamSpeechSettings,
    SpeakerSchema,
    type SarvamSpeechModelId,
} from "./sarvam-speech-settings";
import type { SarvamSpeechAPITypes } from "./sarvam-api-types";
import { z } from "zod";

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
        // speed,
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

        const getSpeaker = (): SarvamSpeechCallOptions["speaker"] => {
            if (sarvamOptions?.speaker) return sarvamOptions.speaker;
            if (voice) {
                return SpeakerSchema.parse(voice);
            }

            switch (this.modelId) {
                case "bulbul:v1":
                    return "meera";
                case "bulbul:v2":
                    return "manisha";
            }

            return "meera";
        };

        // Create request body
        const requestBody: Record<string, unknown> = {
            model: this.modelId,
            text: text,
            target_language_code: this.languageCode,
            speaker: getSpeaker(),
            // response_format: "wav",
            // speed,
            // instructions,
        };

        if (outputFormat) {
            if (
                ["mp3", "opus", "aac", "flac", "wav", "pcm"].includes(
                    outputFormat,
                )
            ) {
                requestBody.response_format = outputFormat;
            } else {
                warnings.push({
                    type: "unsupported-setting",
                    setting: "outputFormat",
                    details: `Unsupported output format: ${outputFormat}. Using mp3 instead.`,
                });
            }
        }

        // Add provider-specific options
        if (sarvamOptions) {
            const speechModelOptions: SarvamSpeechAPITypes = {};

            for (const key in speechModelOptions) {
                const value =
                    speechModelOptions[key as keyof SarvamSpeechAPITypes];
                if (value !== undefined) {
                    requestBody[key] = value;
                }
            }
        }

        return {
            requestBody,
            warnings,
        };
    }

    async doGenerate(
        options: Parameters<SpeechModelV1["doGenerate"]>[0],
    ): Promise<Awaited<ReturnType<SpeechModelV1["doGenerate"]>>> {
        const currentDate =
            this.config._internal?.currentDate?.() ?? new Date();
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
