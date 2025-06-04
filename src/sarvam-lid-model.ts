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
import { SarvamLanguageCodeSchema, SarvamScriptCodeSchema } from "./sarvam-config";
import {
    sarvamFailedResponseHandler
} from "./sarvam-error";

type SarvamLidConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { path: string }) => string;
  fetch?: FetchFunction;
};

export class SarvamLidModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";

  readonly supportsStructuredOutputs = false;
  readonly defaultObjectGenerationMode = "json";

  readonly modelId: "unknown";

  private readonly config: SarvamLidConfig;

  constructor(
    config: SarvamLidConfig,
  ) {
    this.modelId = "unknown";
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
        path: "/text-lid",
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: sarvamFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        sarvamLidResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { input: rawPrompt, ...rawSettings } = args;

    const text = response.language_code ?? undefined;

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
    throw new Error("Language Identification feature doesn't streaming yet");
  }
}

const sarvamLidResponseSchema = z.object({
  script_code: SarvamScriptCodeSchema.nullish(),
  language_code: SarvamLanguageCodeSchema.nullable(),
  request_id: z.string().nullish(),
});
