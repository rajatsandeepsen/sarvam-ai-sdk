import {
    LanguageModelV1,
    SpeechModelV1,
    TranscriptionModelV1
} from "@ai-sdk/provider";
import {
    FetchFunction,
    loadApiKey,
    withoutTrailingSlash,
} from "@ai-sdk/provider-utils";
import { SarvamChatLanguageModel } from "./sarvam-chat-language-model";
import { SarvamChatModelId, SarvamChatSettings } from "./sarvam-chat-settings";
import { SarvamLanguageCode } from "./sarvam-config";
import {
    SarvamSpeechModel,
} from "./sarvam-speech-model";
import { SarvamSpeechModelId, SarvamSpeechSettings } from "./sarvam-speech-settings";
import {
    SarvamTranscriptionModel,
} from "./sarvam-transcription-model";
import { SarvamSpeechTranslationModelId, SarvamTranscriptionCallOptions, SarvamTranscriptionModelId } from "./sarvam-transcription-settings";
import { SarvamTranslationModel } from "./sarvam-translation-model";
import { SarvamTranslationSettings } from "./sarvam-translation-settings";
import { SarvamTransliterateModel } from "./sarvam-transliterate-model";
import { SarvamTransliterateSettings } from "./sarvam-transliterate-settings";
import { SarvamLidModel } from "./sarvam-lid-model";
import { SarvamSpeechTranslationModel } from "./sarvam-speech-translation-model";

export interface SarvamProvider {
  /**
  * Creates a model for text generation.
  */
  (modelId: SarvamChatModelId, settings?: SarvamChatSettings): LanguageModelV1;

  /**
  * Creates an Sarvam chat model for text generation.
  */
  languageModel(
    modelId: SarvamChatModelId,
    settings?: SarvamChatSettings,
  ): LanguageModelV1;

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
  ): TranscriptionModelV1;

  /**
  * Creates a Sarvam model for Speech translation.
  */
  speechTranslation(
    modelId: SarvamSpeechTranslationModelId,
  ): TranscriptionModelV1;

  /**
  * Creates a Sarvam model for speech.
  */
  speech(
    modelId: SarvamSpeechModelId,
    languageCode: SarvamLanguageCode,
    settings?: SarvamSpeechSettings,
  ): SpeechModelV1;

  /**
  * Creates an Sarvam model for transliterate.
  */
  transliterate(settings: SarvamTransliterateSettings): LanguageModelV1;

  /**
  * Creates an Sarvam model for translation.
  */
  translation(settings: SarvamTranslationSettings): LanguageModelV1;

  /**
  * Creates an Sarvam model for language identification.
  */
  languageIdentification(): LanguageModelV1;
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
