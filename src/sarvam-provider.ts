import type {
    LanguageModelV2,
    SpeechModelV2,
    TranscriptionModelV2
} from "@ai-sdk/provider";
import {
    type FetchFunction,
    loadApiKey,
    withoutTrailingSlash,
} from "@ai-sdk/provider-utils";
import { SarvamChatLanguageModel } from "./sarvam-chat-language-model";
import type { SarvamChatModelId, SarvamChatSettings } from "./sarvam-chat-settings";
import type { SarvamLanguageCode } from "./sarvam-config";
import { SarvamLidModel } from "./sarvam-lid-model";
import {
    SarvamSpeechModel,
} from "./sarvam-speech-model";
import { SarvamSpeechModelId, SarvamSpeechSettings } from "./sarvam-speech-settings";
import { SarvamSpeechTranslationModel } from "./sarvam-speech-translation-model";
import {
    SarvamTranscriptionModel,
} from "./sarvam-transcription-model";
import type { SarvamSpeechTranslationModelId, SarvamTranscriptionCallOptions, SarvamTranscriptionModelId } from "./sarvam-transcription-settings";
import { SarvamTranslationModel } from "./sarvam-translation-model";
import type { SarvamTranslationSettings } from "./sarvam-translation-settings";
import { SarvamTransliterateModel } from "./sarvam-transliterate-model";
import type { SarvamTransliterateSettings } from "./sarvam-transliterate-settings";

export interface SarvamProvider {
  /**
  * Creates a model for text generation.
  */
  (modelId: SarvamChatModelId, settings?: SarvamChatSettings): LanguageModelV2;

  /**
  * Creates an Sarvam chat model for text generation.
  */
  languageModel(
    modelId: SarvamChatModelId,
    settings?: SarvamChatSettings,
  ): LanguageModelV2;

  /**
  * Creates a Sarvam model for transcription.
  */
  transcription(
    modelId: SarvamTranscriptionModelId,
    /**
    * Audio source language code
    *
    * @default unknown
    */
    languageCode?: SarvamLanguageCode | "unknown",
    settings?: SarvamTranscriptionCallOptions,
  ): TranscriptionModelV2;

  /**
  * Creates a Sarvam model for Speech translation.
  */
  speechTranslation(
    modelId: SarvamSpeechTranslationModelId,
  ): TranscriptionModelV2;

  /**
  * Creates a Sarvam model for speech.
  */
  speech(
    modelId: SarvamSpeechModelId,
    languageCode: SarvamLanguageCode,
    settings?: SarvamSpeechSettings,
  ): SpeechModelV2;

  /**
  * Creates an Sarvam model for transliterate.
  */
  transliterate(settings: SarvamTransliterateSettings): LanguageModelV2;

  /**
  * Creates an Sarvam model for translation.
  */
  translation(settings: SarvamTranslationSettings): LanguageModelV2;

  /**
  * Creates an Sarvam model for language identification.
  */
  languageIdentification(): LanguageModelV2;
}

export interface SarvamProviderSettings {
  /**
  * URL for the Sarvam API calls.
  * @default https://api.sarvam.ai
  */
  baseURL?: string;

  /**
  * API key for authenticating requests.
  * @default process.env.SARVAM_API_KEY
  */
  apiKey?: string;

  /**
  * Custom headers to include in the requests.
  * @default
    Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
    "api-subscription-key": process.env.SARVAM_API_KEY
  */
  headers?: Record<string, string>;

  /**
  * Custom fetch implementation. You can use it as a middleware to intercept requests,
  * or to provide a custom fetch implementation for e.g. testing.
  */
  fetch?: FetchFunction;
}

/**
* Create an Sarvam provider instance.
*/
export function createSarvam(
  options: SarvamProviderSettings = {},
): SarvamProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL) ?? "https://api.sarvam.ai";

  const getApiKey = () => loadApiKey({
    apiKey: options.apiKey,
    environmentVariableName: "SARVAM_API_KEY",
    description: "Sarvam",
  });

  const getHeaders = () => ({
    Authorization: `Bearer ${getApiKey()}`,
    "api-subscription-key": getApiKey(),
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
  ) => new SarvamTranscriptionModel(modelId, languageCode, {
      provider: "sarvam.transcription",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      transcription: settings,
    });

  const createSpeechTranslation = (
    modelId: SarvamTranscriptionModelId
  ) => new SarvamSpeechTranslationModel(modelId, {
      provider: "sarvam.transcription",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createSpeechModel = (
    modelId: SarvamSpeechModelId,
    languageCode: SarvamLanguageCode,
    settings?: SarvamSpeechSettings,
  ) =>
    new SarvamSpeechModel(modelId, languageCode, {
      provider: "sarvam.speech",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      speech: settings,
    });

  const createTransliterateModel = (settings: SarvamTransliterateSettings) =>
    new SarvamTransliterateModel(
        settings,
      {
        provider: "sarvam.transliterate",
        url: ({ path }) => `${baseURL}${path}`,
        headers: getHeaders,
        fetch: options.fetch,
      },
    );

  const createTranslationModel = (settings: SarvamTranslationSettings) =>
    new SarvamTranslationModel(
        settings,
      {
        provider: "sarvam.translation",
        url: ({ path }) => `${baseURL}${path}`,
        headers: getHeaders,
        fetch: options.fetch,
      },
    );

  const createLidModel = () =>
    new SarvamLidModel(
      {
        provider: "sarvam.lid",
        url: ({ path }) => `${baseURL}${path}`,
        headers: getHeaders,
        fetch: options.fetch,
      },
    );

  const provider = (
    modelId: SarvamChatModelId,
    settings?: SarvamChatSettings,
  ) => createLanguageModel(modelId, settings);

  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.transcription = createTranscriptionModel;
  provider.speechTranslation = createSpeechTranslation;
  provider.speech = createSpeechModel;
  provider.transliterate = createTransliterateModel;
  provider.translation = createTranslationModel;
  provider.languageIdentification = createLidModel;

  return provider;
}

/**
* Default Sarvam provider instance.
*/
export const sarvam = createSarvam();
