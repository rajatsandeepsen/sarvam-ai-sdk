import {
    LanguageModelV1,
    NoSuchModelError,
    ProviderV1,
    TranscriptionModelV1,
} from "@ai-sdk/provider";
import {
    FetchFunction,
    loadApiKey,
    withoutTrailingSlash,
} from "@ai-sdk/provider-utils";
import { SarvamChatLanguageModel } from "./sarvam-chat-language-model";
import { SarvamChatModelId, SarvamChatSettings } from "./sarvam-chat-settings";
import { SarvamTranscriptionModelId } from "./sarvam-transcription-settings";
import { SarvamTranscriptionModel } from "./sarvam-transcription-model";

export interface SarvamProvider {
    /**
Creates a model for text generation.
*/
    (
        modelId: SarvamChatModelId,
        settings?: SarvamChatSettings,
    ): LanguageModelV1;

    /**
Creates an Sarvam chat model for text generation.
   */
    languageModel(
        modelId: SarvamChatModelId,
        settings?: SarvamChatSettings,
    ): LanguageModelV1;

    /**
Creates a model for transcription.
   */
    transcription(modelId: SarvamTranscriptionModelId): TranscriptionModelV1;
}

export interface SarvamProviderSettings {
    /**
Base URL for the Sarvam API calls.
     */
    baseURL?: string;

    /**
API key for authenticating requests.
     */
    apiKey?: string;

    /**
Custom headers to include in the requests.
     */
    headers?: Record<string, string>;

    /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
    fetch?: FetchFunction;
}

/**
Create an Sarvam provider instance.
 */
export function createSarvam(
    options: SarvamProviderSettings = {},
): SarvamProvider {
    const baseURL =
        withoutTrailingSlash(options.baseURL) ??
        "https://api.sarvam.ai/v1";

    const getHeaders = () => ({
        Authorization: `Bearer ${loadApiKey({
            apiKey: options.apiKey,
            environmentVariableName: "SARVAM_API_KEY",
            description: "Sarvam",
        })}`,
        ...options.headers,
    });

    const createChatModel = (
        modelId: SarvamChatModelId,
        settings: SarvamChatSettings = {},
    ) =>
        new SarvamChatLanguageModel(modelId, settings, {
            provider: "sarvam.chat",
            url: ({ path }) => `${baseURL}${path}`,
            headers: getHeaders,
            fetch: options.fetch,
        });

    const createLanguageModel = (
        modelId: SarvamChatModelId,
        settings?: SarvamChatSettings,
    ) => {
        if (new.target) {
            throw new Error(
                "The Sarvam model function cannot be called with the new keyword.",
            );
        }

        return createChatModel(modelId, settings);
    };

    const createTranscriptionModel = (modelId: SarvamTranscriptionModelId) => {
        return new SarvamTranscriptionModel(modelId, {
            provider: "sarvam.transcription",
            url: ({ path }) => `${baseURL}${path}`,
            headers: getHeaders,
            fetch: options.fetch,
        });
    };

    const provider = function (
        modelId: SarvamChatModelId,
        settings?: SarvamChatSettings,
    ) {
        return createLanguageModel(modelId, settings);
    };

    provider.languageModel = createLanguageModel;
    provider.chat = createChatModel;
    // provider.textEmbeddingModel = (modelId: string) => {
    //     throw new NoSuchModelError({
    //         modelId,
    //         modelType: "textEmbeddingModel",
    //     });
    // };
    provider.transcription = createTranscriptionModel;

    return provider;
}

/**
Default Sarvam provider instance.
 */
export const sarvam = createSarvam();
