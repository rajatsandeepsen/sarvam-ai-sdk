import {
	InvalidResponseDataError,
	type LanguageModelV1,
	type LanguageModelV1CallWarning,
	type LanguageModelV1FinishReason,
	type LanguageModelV1FunctionToolCall,
	type LanguageModelV1Prompt,
	type LanguageModelV1ProviderMetadata,
	type LanguageModelV1StreamPart,
} from "@ai-sdk/provider";
import {
	combineHeaders,
	createEventSourceResponseHandler,
	createJsonResponseHandler,
	generateId,
	isParsableJson,
	type ParseResult,
	parseProviderOptions,
	postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { z } from "zod";
import type { SarvamConfig } from "../config";
import { sarvamFailedResponseHandler } from "../error";
import { convertToChatMessages } from "./convert-to-chat-messages";
import { parseInnerJSON, prepareTools } from "./prepare-tools";
import {
	type ChatModelId,
	type ChatSettings,
	chatChunkSchema,
	chatResponseSchema,
	chatSettingsSchema,
} from "./settings";
import { getResponseMetadata, mapSarvamFinishReason } from "./utils";

export class SarvamChatLanguageModel implements LanguageModelV1 {
	readonly specificationVersion = "v1";

	readonly supportsStructuredOutputs = false;
	readonly defaultObjectGenerationMode = "json";

	readonly modelId: ChatModelId;
	readonly settings: ChatSettings;

	private readonly config: SarvamConfig;

	constructor(
		modelId: ChatModelId,
		settings: ChatSettings,
		config: SarvamConfig,
	) {
		this.modelId = modelId;
		this.settings = settings;
		this.config = config;
	}

	get provider(): string {
		return this.config.provider;
	}

	get supportsImageUrls(): boolean {
		return false;
	}

	private async getArgs({
		mode,
		prompt,
		maxTokens,
		temperature,
		topP,
		topK,
		frequencyPenalty,
		presencePenalty,
		stopSequences,
		responseFormat,
		seed,
		stream,
		providerMetadata,
	}: Parameters<LanguageModelV1["doGenerate"]>[0] & {
		stream: boolean;
	}) {
		const type = mode.type;

		const warnings: LanguageModelV1CallWarning[] = [];

		if (topK) {
			warnings.push({
				type: "unsupported-setting",
				setting: "topK",
			});
		}

		const sarvamOptions = parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerMetadata?.sarvam,
					...this.settings,
				},
			},
			schema: chatSettingsSchema,
		});

		const baseArgs = {
			model: this.modelId,
			messages: convertToChatMessages(prompt),

			// standardized settings:
			max_tokens: maxTokens,
			temperature: temperature === 0 ? undefined : temperature,
			top_p: topP,
			frequency_penalty: frequencyPenalty,
			presence_penalty: presencePenalty,
			stop: stopSequences,
			seed,

			...sarvamOptions,

			response_format:
				// json object response format is not supported for streaming:
				stream === false && responseFormat?.type === "json"
					? { type: "json_object" }
					: undefined,
		};

		switch (type) {
			case "regular": {
				const { tools, tool_choice, toolWarnings } = prepareTools({
					mode,
				});

				return {
					args: {
						...baseArgs,
						tools,
						tool_choice,
					},
					warnings: [...warnings, ...toolWarnings],
				};
			}

			case "object-json": {
				return {
					args: {
						...baseArgs,
						response_format:
							// json object response format is not supported for streaming:
							stream === false ? { type: "json_object" } : undefined,
					},
					warnings,
				};
			}

			case "object-tool": {
				return {
					args: {
						...baseArgs,
						tool_choice: {
							type: "function",
							function: { name: mode.tool.name },
						},
						tools: [
							{
								type: "function",
								function: {
									name: mode.tool.name,
									description: mode.tool.description,
									parameters: mode.tool.parameters,
								},
							},
						],
					},
					warnings,
				};
			}

			default: {
				const _exhaustiveCheck: never = type;
				throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
			}
		}
	}

	async doGenerate(
		options: Parameters<LanguageModelV1["doGenerate"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
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
			successfulResponseHandler: createJsonResponseHandler(chatResponseSchema),
			abortSignal: options.abortSignal,
			fetch: this.config.fetch,
		});

		const { messages: rawPrompt, ...rawSettings } = args;
		const choice = response.choices[0];

		let text = choice.message.content ?? undefined;

		if (options.mode.type === "object-json" && text) {
			text = parseInnerJSON(text);
		}

		const toolCalls = choice.message.tool_calls?.map((toolCall) => ({
			toolCallType: "function",
			toolCallId: toolCall.id ?? (this.config.generateId ?? generateId)(),
			toolName: toolCall.function.name,
			args: toolCall.function.arguments,
		})) satisfies LanguageModelV1FunctionToolCall[] | undefined;

		return {
			text,
			toolCalls,
			reasoning: choice.message.reasoning ?? undefined,
			finishReason: mapSarvamFinishReason(choice.finish_reason),
			usage: {
				promptTokens: response.usage?.prompt_tokens ?? NaN,
				completionTokens: response.usage?.completion_tokens ?? NaN,
			},
			rawCall: { rawPrompt, rawSettings },
			rawResponse: { headers: responseHeaders, body: rawResponse },
			response: getResponseMetadata(response),
			warnings,
			request: { body },
		};
	}

	async doStream(
		options: Parameters<LanguageModelV1["doStream"]>[0],
	): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
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
			successfulResponseHandler:
				createEventSourceResponseHandler(chatChunkSchema),
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

		let finishReason: LanguageModelV1FinishReason = "unknown";
		let usage: {
			promptTokens: number | undefined;
			completionTokens: number | undefined;
		} = {
			promptTokens: undefined,
			completionTokens: undefined,
		};
		let isFirstChunk = true;

		let providerMetadata: LanguageModelV1ProviderMetadata | undefined;
		return {
			stream: response.pipeThrough(
				new TransformStream<
					ParseResult<z.infer<typeof chatChunkSchema>>,
					LanguageModelV1StreamPart
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
