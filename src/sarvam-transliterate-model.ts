import type {
    LanguageModelV2,
    LanguageModelV2CallWarning
} from "@ai-sdk/provider";
import {
    type FetchFunction,
    combineHeaders,
    createJsonResponseHandler,
    postJsonToApi
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import { convertToSarvamChatMessages } from "./convert-to-sarvam-chat-messages";
import { SarvamLanguageCodeSchema } from "./sarvam-config";
import {
    sarvamFailedResponseHandler
} from "./sarvam-error";
import type { SarvamTransliterateSettings } from "./sarvam-transliterate-settings";

type SarvamTransliterateConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { path: string }) => string;
  fetch?: FetchFunction;
};

export class SarvamTransliterateModel implements LanguageModelV2 {
  readonly specificationVersion = "v2";

  readonly supportsStructuredOutputs = false;
  readonly defaultObjectGenerationMode = "json";

  readonly supportedUrls = {
      'image/*': [/^https?:\/\/.*$/],
    };

  readonly modelId: "unknown";
  readonly settings: SarvamTransliterateSettings;

  private readonly config: SarvamTransliterateConfig;

  constructor(
    settings: SarvamTransliterateSettings,
    config: SarvamTransliterateConfig,
  ) {
    this.modelId = "unknown";
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

    if (this.settings.from !== "auto") {
      if (this.settings.to !== "en-IN" && this.settings.from !== "en-IN")
        throw new Error(
          "Sarvam doesn't support Indic-Indic Transliteration yet",
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
        ...(this.settings.spoken_form
          ? {
              spoken_form: this.settings.spoken_form,
              spoken_form_numerals_language:
                this.settings.spoken_form_numerals_language ?? "english",
            }
          : {}),
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
        path: "/transliterate",
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: sarvamFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        sarvamTransliterateResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { input: rawPrompt, ...rawSettings } = args;

    let text = response.transliterated_text ?? undefined;

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
    throw new Error("Transliterate feature doesn't streaming yet");
  }
}

const sarvamTransliterateResponseSchema = z.object({
  transliterated_text: z.string().nullish(),
  source_language_code: SarvamLanguageCodeSchema.nullable(),
  request_id: z.string().nullish(),
});
