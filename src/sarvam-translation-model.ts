import type { LanguageModelV2, LanguageModelV2CallWarning } from "@ai-sdk/provider";
import {
  type FetchFunction,
  combineHeaders,
  createJsonResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import { convertToSarvamChatMessages } from "./convert-to-sarvam-chat-messages";
import { SarvamLanguageCodeSchema } from "./sarvam-config";
import { sarvamFailedResponseHandler } from "./sarvam-error";
import type { SarvamTranslationSettings } from "./sarvam-translation-settings";

type SarvamTranslationConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { path: string }) => string;
  fetch?: FetchFunction;
};

export class SarvamTranslationModel implements LanguageModelV2 {
  readonly specificationVersion = "v2";

  readonly supportsStructuredOutputs = false;
  readonly defaultObjectGenerationMode = "json";

  readonly supportedUrls = {
    "image/*": [/^https?:\/\/.*$/],
  };

  readonly modelId: NonNullable<SarvamTranslationSettings["model"]>;
  readonly settings: SarvamTranslationSettings;

  private readonly config: SarvamTranslationConfig;

  constructor(
    settings: SarvamTranslationSettings,
    config: SarvamTranslationConfig,
  ) {
    this.modelId = settings.model ?? "mayura:v1";
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  get supportsImageUrls(): boolean {
    // image urls can be sent if downloadImages is disabled (default):
    return false;
  }

  private getArgs({
    stream,
    prompt,
  }: Parameters<LanguageModelV2["doGenerate"]>[0] & {
    stream: boolean;
  }) {
    const warnings: LanguageModelV2CallWarning[] = [];

    if (this.settings.from === this.settings.to) {
      throw new Error("Source and target languages code must be different.");
    }

    if (this.modelId === "sarvam-translate:v1") {
      if ((this.settings.mode ?? "formal") !== "formal")
        throw new Error(
          "Sarvam 'sarvam-translate:v1' only support mode formal.",
        );
      if ((this.settings.from ?? "auto") === "auto")
        throw new Error(
          "Sarvam 'sarvam-translate:v1' requires source language code.",
        );
    }

    if (stream) {
      const _exhaustiveCheck = "streaming";
      throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
    }

    const messages = convertToSarvamChatMessages(prompt);

    return {
      messages,
      args: {
        input: messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join("\n"),
        source_language_code: this.settings.from ?? "auto",
        target_language_code: this.settings.to,
        numerals_format: this.settings.numerals_format ?? "international",
        enable_preprocessing: this.settings.enable_preprocessing ?? false,
        output_script: this.settings.output_script ?? null,
        speaker_gender: this.settings.speaker_gender ?? "Male",
        mode: this.settings.mode ?? "formal",
        model: this.modelId,
      },
      warnings,
    };
  }

  async doGenerate(
    options: Parameters<LanguageModelV2["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
    const { args, warnings, messages } = this.getArgs({
      ...options,
      stream: false,
    });

    const body = JSON.stringify(args);

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: this.config.url({
        path: "/translate",
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: sarvamFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        sarvamTranslationResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { input: rawPrompt, ...rawSettings } = args;

    const text = response.translated_text ?? undefined;

    return {
        content: text ? [{
            type: "text",
            text,
        }] : [],
      // text,
      // toolCalls: undefined,
      // reasoning: undefined,
      finishReason: "unknown",
      usage: {
          inputTokens: NaN,
          outputTokens: NaN,
          totalTokens: NaN
      },
      // rawCall: { rawPrompt, rawSettings },
      // rawResponse: { headers: responseHeaders, body: rawResponse },
      response: undefined,
      warnings,
      request: { body },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV2["doStream"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
    throw new Error("Translation feature doesn't support streaming yet");
  }
}

const sarvamTranslationResponseSchema = z.object({
  translated_text: z.string().nullish(),
  source_language_code: SarvamLanguageCodeSchema.nullable(),
  request_id: z.string().nullish(),
});
