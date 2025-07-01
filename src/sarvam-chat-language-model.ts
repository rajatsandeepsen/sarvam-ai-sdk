import type {
  InvalidResponseDataError,
  LanguageModelV2,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2FunctionTool,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
  LanguageModelV2ToolCall,
  SharedV2ProviderMetadata,
} from "@ai-sdk/provider";
import {
  type FetchFunction,
  type ParseResult,
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  isParsableJson,
  parseProviderOptions,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import { convertToSarvamChatMessages } from "./convert-to-sarvam-chat-messages";
import { getResponseMetadata } from "./get-response-metadata";
import { mapSarvamFinishReason } from "./map-sarvam-finish-reason";
import type {
  SarvamChatModelId,
  SarvamChatSettings,
} from "./sarvam-chat-settings";
import {
  sarvamErrorDataSchema,
  sarvamFailedResponseHandler,
} from "./sarvam-error";
import {
  extractToolCallData,
  parseJSON,
  prepareTools,
  simulateJsonSchema,
  simulateToolCalling,
} from "./sarvam-prepare-tools";

type SarvamChatConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: FetchFunction;
};

export class SarvamChatLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2";

  readonly supportsStructuredOutputs = false;
  readonly defaultObjectGenerationMode = "json";

  readonly modelId: SarvamChatModelId;
  readonly settings: SarvamChatSettings;

  readonly supportedUrls = {
    "image/*": [/^https?:\/\/.*$/],
  };

  private readonly config: SarvamChatConfig;

  constructor(
    modelId: SarvamChatModelId,
    settings: SarvamChatSettings,
    config: SarvamChatConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  get supportsImageUrls(): boolean {
    // image urls can be sent if downloadImages is disabled (default):
    return !this.settings.downloadImages;
  }

  private async getArgs({
    stream,
    prompt,
    tools,
    toolChoice,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    providerOptions,
  }: Parameters<LanguageModelV2["doGenerate"]>[0] & {
    stream: boolean;
  }) {
    const simulate = this.settings.simulate;

    if (type === "object-json" && simulate === "tool-calling")
      throw new Error('Use { simulate: "json-object" } with generateObject()');

    if (type === "regular" && simulate === "json-object")
      throw new Error('Use { simulate: "tool-calling" } with generateText()');

    const warnings: LanguageModelV2CallWarning[] = [];

    if (stream) {
      warnings.push({
        type: "other",
        message: "Streaming is still experimental for Sarvam",
      });
    }

    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK",
      });
    }

    if (
      responseFormat != null &&
      responseFormat.type === "json" &&
      responseFormat.schema != null
    ) {
      warnings.push({
        type: "unsupported-setting",
        setting: "responseFormat",
        details: "JSON response format schema is not supported",
      });
    }

    const sarvamOptions = parseProviderOptions({
      provider: "sarvam",
      providerOptions,
      schema: z.object({
        reasoningFormat: z.enum(["parsed", "raw", "hidden"]).nullish(),
      }),
    });

    const {
      tools: sarvamTools,
      toolChoice: sarvamToolChoice,
      toolWarnings,
    } = prepareTools({ tools, toolChoice });

    const extraSystemPrompt =
      (sarvamTools && simulate === "tool-calling")
        ? await simulateToolCalling(sarvamTools)
        : simulate === "json-object"
          ? simulateJsonSchema()
          : undefined;

    return {
      args: {
        model: this.modelId,

        // model specific settings:
        user: this.settings.user,
        parallel_tool_calls: this.settings.parallelToolCalls,

        // standardized settings:
        max_tokens: maxOutputTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop: stopSequences,
        seed,

        // response format:
        response_format:
          // json object response format is not supported for streaming:
          stream === false && responseFormat?.type === "json"
            ? { type: "json_object" }
            : undefined,

        // provider options:
        reasoning_format: sarvamOptions?.reasoningFormat,

        // messages:
        messages: convertToSarvamChatMessages(prompt, extraSystemPrompt),

        // tools:
        tools: sarvamTools,
        tool_choice: sarvamToolChoice,
      },
      warnings: [...warnings, ...toolWarnings],
    };
  }

  async doGenerate(
    options: Parameters<LanguageModelV2["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
    const { args, warnings } = await this.getArgs({
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
        path: "/chat/completions",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: sarvamFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        sarvamChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    const choice = response.choices[0];
    const content: Array<LanguageModelV2Content> = [];

    // text content:
    let text = choice.message.content;
    if (text != null && text.length > 0) {
      content.push({ type: "text", text: text });
    }

    // reasoning:
    const reasoning = choice.message.reasoning;
    if (reasoning != null && reasoning.length > 0) {
      content.push({
        type: "reasoning",
        text: reasoning,
      });
    }

    // tool calls:
    if (choice.message.tool_calls != null) {
      for (const toolCall of choice.message.tool_calls) {
        content.push({
          type: "tool-call",
          toolCallId: toolCall.id ?? generateId(),
          toolName: toolCall.function.name,
          input: toolCall.function.arguments!,
        });
      }
    }

    let toolCalls = choice.message.tool_calls?.map((toolCall) => ({
      toolCallType: "function",
      toolCallId: toolCall.id ?? generateId(),
      toolName: toolCall.function.name,
      args: toolCall.function.arguments!,
    })) as LanguageModelV2ToolCall[] | undefined;

    // simulate tool calling through prompt engineering
    if (this.settings.simulate === "tool-calling") {
      if (text && text.length !== 0) {
        const jsonObject = parseJSON(text);
        if (jsonObject) {
          const newTools = extractToolCallData(jsonObject);
          if (newTools) {
            toolCalls = [newTools];
            text = undefined;
          }
        }
      }
    }

    // simulate JSON object generation through prompt engineering
    if (this.settings.simulate === "json-object") {
      if (text && text.length !== 0) {
        const jsonObject = parseJSON(text);
        if (jsonObject) {
          const newTools = extractToolCallData(jsonObject);
          text = JSON.stringify(jsonObject);
        }
      }
    }

    // return {
    //   text,
    //   toolCalls,
    //   reasoning: choice.message.reasoning ?? undefined,
    //   finishReason: mapSarvamFinishReason(choice.finish_reason),
    //   usage: {
    //     promptTokens: response.usage?.prompt_tokens ?? NaN,
    //     completionTokens: response.usage?.completion_tokens ?? NaN,
    //   },
    //   rawCall: { rawPrompt, rawSettings },
    //   rawResponse: { headers: responseHeaders, body: rawResponse },
    //   response: getResponseMetadata(response),
    //   warnings,
    //   request: { body },
    // };

    return {
      content,
      finishReason: "unknown",
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? undefined,
        outputTokens: response.usage?.completion_tokens ?? undefined,
        totalTokens: undefined,
      },
      response: undefined,
      warnings,
      request: { body },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV2["doStream"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
    const { args, warnings } = await this.getArgs({ ...options, stream: true });

    const body = JSON.stringify({ ...args, stream: true });

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: {
        ...args,
        stream: true,
      },
      failedResponseHandler: sarvamFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        sarvamChatChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    const toolCalls: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
      hasFinished: boolean;
    }> = [];

    let finishReason: LanguageModelV2FinishReason = "unknown";
    let usage: {
      promptTokens: number | undefined;
      completionTokens: number | undefined;
    } = {
      promptTokens: undefined,
      completionTokens: undefined,
    };
    let isFirstChunk = true;

    let providerMetadata: SharedV2ProviderMetadata | undefined;
    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof sarvamChatChunkSchema>>,
          LanguageModelV2StreamPart
        >({
          transform(chunk, controller) {
            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              finishReason = "error";
              controller.enqueue({
                type: "error",
                error: chunk.error,
              });
              return;
            }

            const value = chunk.value;

            // handle error chunks:
            if ("error" in value) {
              finishReason = "error";
              controller.enqueue({
                type: "error",
                error: value.error,
              });
              return;
            }

            if (isFirstChunk) {
              isFirstChunk = false;

              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value),
              });
            }

            if (value.x_sarvam?.usage != null) {
              usage = {
                promptTokens: value.x_sarvam.usage.prompt_tokens ?? undefined,
                completionTokens:
                  value.x_sarvam.usage.completion_tokens ?? undefined,
              };
            }

            const choice = value.choices[0];

            if (choice?.finish_reason != null) {
              finishReason = mapSarvamFinishReason(choice.finish_reason);
            }

            if (choice?.delta == null) {
              return;
            }

            const delta = choice.delta;

            if (delta.reasoning != null && delta.reasoning.length > 0) {
              controller.enqueue({
                type: "reasoning",
                textDelta: delta.reasoning,
              });
            }

            if (delta.content != null && delta.content.length > 0) {
              controller.enqueue({
                type: "text-delta",
                textDelta: delta.content,
              });
            }

            if (delta.tool_calls != null) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                if (toolCalls[index] == null) {
                  if (toolCallDelta.type !== "function") {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function' type.`,
                    });
                  }

                  if (toolCallDelta.id == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`,
                    });
                  }

                  if (toolCallDelta.function?.name == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`,
                    });
                  }

                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: "function",
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: toolCallDelta.function.arguments ?? "",
                    },
                    hasFinished: false,
                  };

                  const toolCall = toolCalls[index];

                  if (
                    toolCall.function?.name != null &&
                    toolCall.function?.arguments != null
                  ) {
                    // send delta if the argument text has already started:
                    if (toolCall.function.arguments.length > 0) {
                      controller.enqueue({
                        type: "tool-call-delta",
                        toolCallType: "function",
                        toolCallId: toolCall.id,
                        toolName: toolCall.function.name,
                        argsTextDelta: toolCall.function.arguments,
                      });
                    }

                    // check if tool call is complete
                    // (some providers send the full tool call in one chunk):
                    if (isParsableJson(toolCall.function.arguments)) {
                      controller.enqueue({
                        type: "tool-call",
                        toolCallType: "function",
                        toolCallId: toolCall.id ?? generateId(),
                        toolName: toolCall.function.name,
                        args: toolCall.function.arguments,
                      });
                      toolCall.hasFinished = true;
                    }
                  }

                  continue;
                }

                // existing tool call, merge if not finished
                const toolCall = toolCalls[index];

                if (toolCall.hasFinished) {
                  continue;
                }

                if (toolCallDelta.function?.arguments != null) {
                  toolCall.function!.arguments +=
                    toolCallDelta.function?.arguments ?? "";
                }

                // send delta
                controller.enqueue({
                  type: "tool-call-delta",
                  toolCallType: "function",
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  argsTextDelta: toolCallDelta.function.arguments ?? "",
                });

                // check if tool call is complete
                if (
                  toolCall.function?.name != null &&
                  toolCall.function?.arguments != null &&
                  isParsableJson(toolCall.function.arguments)
                ) {
                  controller.enqueue({
                    type: "tool-call",
                    toolCallType: "function",
                    toolCallId: toolCall.id ?? generateId(),
                    toolName: toolCall.function.name,
                    args: toolCall.function.arguments,
                  });
                  toolCall.hasFinished = true;
                }
              }
            }
          },

          flush(controller) {
            controller.enqueue({
              type: "finish",
              finishReason,
              usage: {
                promptTokens: usage.promptTokens ?? NaN,
                completionTokens: usage.completionTokens ?? NaN,
              },
              ...(providerMetadata != null ? { providerMetadata } : {}),
            });
          },
        }),
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings,
      request: { body },
    };
  }
}

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const sarvamChatResponseSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullish(),
        reasoning: z.string().nullish(),
        tool_calls: z
          .array(
            z.object({
              id: z.string().nullish(),
              type: z.literal("function"),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            }),
          )
          .nullish(),
      }),
      index: z.number(),
      finish_reason: z.string().nullish(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().nullish(),
      completion_tokens: z.number().nullish(),
    })
    .nullish(),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const sarvamChatChunkSchema = z.union([
  z.object({
    id: z.string().nullish(),
    created: z.number().nullish(),
    model: z.string().nullish(),
    choices: z.array(
      z.object({
        delta: z
          .object({
            content: z.string().nullish(),
            reasoning: z.string().nullish(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().nullish(),
                  type: z.literal("function").optional(),
                  function: z.object({
                    name: z.string().nullish(),
                    arguments: z.string().nullish(),
                  }),
                }),
              )
              .nullish(),
          })
          .nullish(),
        finish_reason: z.string().nullable().optional(),
        index: z.number(),
      }),
    ),
    x_sarvam: z
      .object({
        usage: z
          .object({
            prompt_tokens: z.number().nullish(),
            completion_tokens: z.number().nullish(),
          })
          .nullish(),
      })
      .nullish(),
  }),
  sarvamErrorDataSchema,
]);
