import {
    LanguageModelV1,
    LanguageModelV1CallWarning
} from "@ai-sdk/provider";
import {
    FetchFunction,
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
import { SarvamTranslationSettings } from "./sarvam-translation-settings";

type SarvamTranslationConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { path: string }) => string;
  fetch?: FetchFunction;
};

export class SarvamTranslationModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";

  readonly supportsStructuredOutputs = false;
  readonly defaultObjectGenerationMode = "json";

  readonly modelId: "unknown";
  readonly settings: SarvamTranslationSettings;

  private readonly config: SarvamTranslationConfig;

  constructor(
    settings: SarvamTranslationSettings,
    config: SarvamTranslationConfig,
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
    mode,
    prompt,
  }: Parameters<LanguageModelV1["doGenerate"]>[0] & {
    stream: boolean;
  }) {
    const type = mode.type;

    const warnings: LanguageModelV1CallWarning[] = [];

    if (this.settings.from !== "auto") {
      if (this.settings.to !== "en-IN" && this.settings.from !== "en-IN")
        throw new Error(
          "Sarvam doesn't support Indic-Indic Transliteration yet",
        );
    }

    if (type !== "regular") {
      const _exhaustiveCheck = type;
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
        // model: this.settings.model ?? "male",
      },
      warnings,
    };
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
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
      text,
      toolCalls: undefined,
      reasoning: undefined,
      finishReason: "unknown",
      usage: {
        promptTokens: NaN,
        completionTokens: NaN,
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders, body: rawResponse },
      response: undefined,
      warnings,
      request: { body },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    throw new Error("Translation feature doesn't streaming yet");
  }
}

const sarvamTranslationResponseSchema = z.object({
  translated_text: z.string().nullish(),
  source_language_code: SarvamLanguageCodeSchema.nullable(),
  request_id: z.string().nullish(),
});
