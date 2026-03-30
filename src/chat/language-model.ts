import {
	InvalidResponseDataError,
	type LanguageModelV3,
	type LanguageModelV3CallOptions,
	type LanguageModelV3Content,
	type LanguageModelV3FinishReason,
	type LanguageModelV3StreamPart,
	type LanguageModelV3Text,
	type LanguageModelV3ToolCall,
	type SharedV3Warning,
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
import { prepareTools } from "./prepare-tools";
import {
	type ChatModelId,
	type ChatSettings,
	chatChunkSchema,
	chatResponseSchema,
	chatSettingsSchema,
} from "./settings";
import { getResponseMetadata, mapSarvamFinishReason } from "./utils";

export class SarvamChatLanguageModel implements LanguageModelV3 {
	readonly specificationVersion = "v3";

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

	get supportedUrls(): Record<string, RegExp[]> {
		// Sarvam models don't have native URL support for content
		return {};
	}

	private async getArgs(
		options: LanguageModelV3CallOptions & {
			stream: boolean;
		},
	) {
		const {
			prompt,
			maxOutputTokens,
			temperature,
			topP,
			topK,
			frequencyPenalty,
			presencePenalty,
			stopSequences,
			responseFormat,
			seed,
			tools,
			toolChoice,
			providerOptions,
			stream,
		} = options;

		const warnings: SharedV3Warning[] = [];

		if (topK) {
			warnings.push({
				type: "unsupported",
				feature: "topK",
			});
		}

		const sarvamOptions = await parseProviderOptions({
			provider: "sarvam",
			providerOptions: {
				sarvam: {
					...providerOptions?.sarvam,
					...this.settings,
				},
			},
			schema: chatSettingsSchema,
		});

		const baseArgs = {
			model: this.modelId,
			messages: convertToChatMessages(prompt),

			// standardized settings:
			max_tokens: maxOutputTokens,
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

		let toolsArg: ReturnType<typeof prepareTools> | null = null;

		if (tools && tools.length > 0) {
			toolsArg = prepareTools({
				tools,
				toolChoice,
			});
		}

		if (responseFormat?.type === "json") {
			const objectMode = responseFormat;
			toolsArg = {
				toolWarnings: [],
				tool_choice: {
					type: "function",
					function: { name: objectMode.name ?? "response" },
				},
				tools: [
					{
						type: "function",
						function: {
							name: objectMode.name ?? "response",
							description: objectMode.description,
							parameters: objectMode.schema,
						},
					},
				],
			} satisfies ReturnType<typeof prepareTools>;
		}

		return {
			args: {
				...baseArgs,
				...(toolsArg ?? {}),
			},
			warnings: [...warnings, ...(toolsArg?.toolWarnings ?? [])] as Array<
				{ type: string; setting?: string } | { type: string; tool?: unknown }
			>,
		};
	}

	async doGenerate(
		options: LanguageModelV3CallOptions,
	): Promise<Awaited<ReturnType<LanguageModelV3["doGenerate"]>>> {
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

		const choice = response.choices[0];

		const content: LanguageModelV3Content[] = [];

		if (choice.message.content) {
			content.push({
				type: "text",
				text: choice.message.content,
			} as LanguageModelV3Text);
		}

		// Add reasoning content if present
		if (choice.message.reasoning) {
			content.push({
				type: "reasoning",
				text: choice.message.reasoning,
			});
		}

		// Add tool calls if present
		if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
			if (options.responseFormat?.type === "json") {
				content.push({
					type: "text",
					text: choice.message.tool_calls[0].function.arguments,
				} as LanguageModelV3Text);
			}

			for (const toolCall of choice.message.tool_calls) {
				content.push({
					type: "tool-call",
					toolCallId: toolCall.id ?? (this.config.generateId ?? generateId)(),
					toolName: toolCall.function.name,
					input: toolCall.function.arguments,
				} as LanguageModelV3ToolCall);
			}
		}

		return {
			content,
			finishReason: mapSarvamFinishReason(choice.finish_reason),
			usage: {
				inputTokens: {
					total: response.usage?.prompt_tokens ?? undefined,
					noCache: undefined,
					cacheRead: undefined,
					cacheWrite: undefined,
				},
				outputTokens: {
					total: response.usage?.completion_tokens ?? undefined,
					text: undefined,
					reasoning: undefined,
				},
			},
			warnings,
			request: { body },
			response: { headers: responseHeaders, body: rawResponse },
		} as unknown as Awaited<ReturnType<LanguageModelV3["doGenerate"]>>;
	}

	async doStream(
		options: LanguageModelV3CallOptions,
	): Promise<Awaited<ReturnType<LanguageModelV3["doStream"]>>> {
		const { args } = await this.getArgs({ ...options, stream: true });

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

		const toolCalls: Array<{
			id: string;
			name: string;
			arguments: string;
			hasFinished: boolean;
		}> = [];

		let finishReason: LanguageModelV3FinishReason =
			"other" as unknown as LanguageModelV3FinishReason;
		let usage: {
			inputTokens: {
				total: number | undefined;
				noCache: number | undefined;
				cacheRead: number | undefined;
				cacheWrite: number | undefined;
			};
			outputTokens: {
				total: number | undefined;
				text: number | undefined;
				reasoning: number | undefined;
			};
		} = {
			inputTokens: {
				total: undefined,
				noCache: undefined,
				cacheRead: undefined,
				cacheWrite: undefined,
			},
			outputTokens: {
				total: undefined,
				text: undefined,
				reasoning: undefined,
			},
		};
		let isFirstChunk = true;
		const _getThisConfig = this.config;

		return {
			stream: response.pipeThrough(
				new TransformStream<
					ParseResult<z.infer<typeof chatChunkSchema>>,
					LanguageModelV3StreamPart
				>({
					transform(chunk, controller) {
						// handle failed chunk parsing / validation:
						if (!chunk.success) {
							finishReason = "error" as unknown as LanguageModelV3FinishReason;
							controller.enqueue({
								type: "error",
								error: chunk.error,
							});
							return;
						}

						const value = chunk.value;

						// handle error chunks:
						if ("error" in value) {
							finishReason = "error" as unknown as LanguageModelV3FinishReason;
							controller.enqueue({
								type: "error",
								error: value.error,
							});
							return;
						}

						if (isFirstChunk) {
							isFirstChunk = false;

							const metadata = getResponseMetadata(value);
							if (metadata.id || metadata.timestamp || metadata.modelId) {
								controller.enqueue({
									type: "response-metadata",
									...metadata,
								});
							}
						}

						if (value.x_sarvam?.usage != null) {
							usage = {
								inputTokens: {
									total: value.x_sarvam.usage.prompt_tokens ?? undefined,
									noCache: undefined,
									cacheRead: undefined,
									cacheWrite: undefined,
								},
								outputTokens: {
									total: value.x_sarvam.usage.completion_tokens ?? undefined,
									text: undefined,
									reasoning: undefined,
								},
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

						// Handle reasoning
						if (delta.reasoning != null && delta.reasoning.length > 0) {
							// V2 uses reasoning-start, reasoning-delta, reasoning-end pattern
							// For simplicity, we emit as a single reasoning-delta
							controller.enqueue({
								type: "reasoning-delta",
								id: "reasoning-0",
								delta: delta.reasoning,
							});
						}

						// Handle text content
						if (delta.content != null && delta.content.length > 0) {
							controller.enqueue({
								type: "text-delta",
								id: "text-0",
								delta: delta.content,
							});
						}

						// Handle tool calls
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
										name: toolCallDelta.function.name,
										arguments: toolCallDelta.function.arguments ?? "",
										hasFinished: false,
									};

									const toolCall = toolCalls[index];

									if (toolCall.name != null && toolCall.arguments != null) {
										// send delta if the argument text has already started:
										if (toolCall.arguments.length > 0) {
											controller.enqueue({
												type: "tool-input-delta",
												id: toolCall.id,
												delta: toolCall.arguments,
											});
										}

										// check if tool call is complete
										// (some providers send the full tool call in one chunk):
										if (isParsableJson(toolCall.arguments)) {
											controller.enqueue({
												type: "tool-call",
												toolCallId: toolCall.id,
												toolName: toolCall.name,
												input: toolCall.arguments,
											} as LanguageModelV3ToolCall);
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
									toolCall.arguments += toolCallDelta.function?.arguments ?? "";
								}

								// send delta
								controller.enqueue({
									type: "tool-input-delta",
									id: toolCall.id,
									delta: toolCallDelta.function.arguments ?? "",
								});

								// check if tool call is complete
								if (
									toolCall.name != null &&
									toolCall.arguments != null &&
									isParsableJson(toolCall.arguments)
								) {
									controller.enqueue({
										type: "tool-call",
										toolCallId: toolCall.id,
										toolName: toolCall.name,
										input: toolCall.arguments,
									} as LanguageModelV3ToolCall);
									toolCall.hasFinished = true;
								}
							}
						}
					},

					flush(controller) {
						controller.enqueue({
							type: "finish",
							finishReason,
							usage,
						});
					},
				}),
			),
			request: { body },
			response: { headers: responseHeaders },
		};
	}
}
