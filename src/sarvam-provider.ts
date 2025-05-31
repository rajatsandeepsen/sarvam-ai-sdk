import {
    LanguageModelV1,
    SpeechModelV1,
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
import {
    SarvamTranscriptionCallOptions,
    SarvamTranscriptionModel,
} from "./sarvam-transcription-model";
import { SarvamSpeechModelId } from "./sarvam-speech-settings";
import {
    SarvamSpeechCallOptions,
    SarvamSpeechModel,
} from "./sarvam-speech-model";
import { SarvamLanguageCode } from "./sarvam-config";

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
    transcription(
        modelId: SarvamTranscriptionModelId,
        languageCode?: SarvamLanguageCode | "unknown",
        settings?: SarvamTranscriptionCallOptions,
    ): TranscriptionModelV1;

    /**
Creates a model for speech.
   */
    speech(
        modelId: SarvamSpeechModelId,
        languageCode: SarvamLanguageCode,
        settings?: SarvamSpeechCallOptions,
    ): SpeechModelV1;
}

export interface SarvamProviderSettings {
    /**
Base URL for the Sarvam API calls.
@default https://api.sarvam.ai
     */
    baseURL?: string;

    /**
API key for authenticating requests.
@default process.env.SARVAM_API_KEY
     */
    apiKey?: string;

    /**
Custom headers to include in the requests.
@default Authorization: `Bearer ${process.env.SARVAM_API_KEY}`, "api-subscription-key": process.env.SARVAM_API_KEY
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
        withoutTrailingSlash(options.baseURL) ?? "https://api.sarvam.ai";

    const ApiKey = loadApiKey({
        apiKey: options.apiKey,
        environmentVariableName: "SARVAM_API_KEY",
        description: "Sarvam",
    });

    const getHeaders = () => ({
        Authorization: `Bearer ${ApiKey}`,
        "api-subscription-key": ApiKey,
        ...options.headers,
    });

    const createChatModel = (
        modelId: SarvamChatModelId,
        settings: SarvamChatSettings = {},
    ) =>
        new SarvamChatLanguageModel(modelId, settings, {
            provider: "sarvam.chat",
            url: ({ path }) => `${baseURL}/v1${path}`,
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

    const createTranscriptionModel = (
        modelId: SarvamTranscriptionModelId,
        languageCode: SarvamLanguageCode | "unknown" = "unknown",
        settings?: SarvamTranscriptionCallOptions,
    ) => {
        return new SarvamTranscriptionModel(modelId, languageCode, {
            provider: "sarvam.transcription",
            url: ({ path }) => `${baseURL}${path}`,
            headers: getHeaders,
            fetch: options.fetch,
            transcription: settings,
        });
    };

    const createSpeechModel = (
        modelId: SarvamSpeechModelId,
        languageCode: SarvamLanguageCode,
        settings?: SarvamSpeechCallOptions,
    ) =>
        new SarvamSpeechModel(modelId, languageCode, {
            provider: `sarvam.speech`,
            url: ({ path }) => `${baseURL}${path}`,
            headers: getHeaders,
            fetch: options.fetch,
            speech: settings,
        });

    const provider = (
        modelId: SarvamChatModelId,
        settings?: SarvamChatSettings,
    ) => createLanguageModel(modelId, settings);

    provider.languageModel = createLanguageModel;
    provider.chat = createChatModel;
    // provider.textEmbeddingModel = (modelId: string) => {
    //     throw new NoSuchModelError({
    //         modelId,
    //         modelType: "textEmbeddingModel",
    //     });
    // };
    provider.transcription = createTranscriptionModel;
    provider.speech = createSpeechModel;

    return provider;
}

/**
Default Sarvam provider instance.
 */
export const sarvam = createSarvam();
