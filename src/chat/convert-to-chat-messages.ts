import {
	type LanguageModelV3Prompt,
	UnsupportedFunctionalityError,
} from "@ai-sdk/provider";
import { convertUint8ArrayToBase64 } from "@ai-sdk/provider-utils";
import type { SarvamChatPrompt } from "./types";

export function convertToChatMessages(
	prompt: LanguageModelV3Prompt,
): SarvamChatPrompt {
	const messages: SarvamChatPrompt = [];

	for (const message of prompt) {
		switch (message.role) {
			case "system": {
				messages.push({ role: "system", content: message.content });
				break;
			}

			case "user": {
				if (
					message.content.length === 1 &&
					message.content[0].type === "text"
				) {
					messages.push({
						role: "user",
						content: message.content[0].text,
					});
					break;
				}

				messages.push({
					role: "user",
					content: message.content.map((part) => {
						switch (part.type) {
							case "text": {
								return { type: "text", text: part.text };
							}
							case "file": {
								// Convert file to image_url format for backward compatibility
								let imageData: string;
								if (typeof part.data === "string") {
									// Data is already base64 or URL
									if (
										part.data.startsWith("http://") ||
										part.data.startsWith("https://")
									) {
										imageData = part.data;
									} else {
										// Assume it's base64
										imageData = `data:${part.mediaType};base64,${part.data}`;
									}
								} else if (part.data instanceof URL) {
									imageData = part.data.toString();
								} else {
									// Data is Uint8Array
									imageData = `data:${part.mediaType};base64,${convertUint8ArrayToBase64(part.data)}`;
								}

								return {
									type: "image_url",
									image_url: {
										url: imageData,
									},
								};
							}

							default: {
								const _exhaustiveCheck: never = part;
								throw new UnsupportedFunctionalityError({
									functionality: `Unsupported content part type: ${_exhaustiveCheck}`,
								});
							}
						}
					}),
				});

				break;
			}

			case "assistant": {
				let text = "";
				const toolCalls: Array<{
					id: string;
					type: "function";
					function: { name: string; arguments: string };
				}> = [];

				for (const part of message.content) {
					switch (part.type) {
						case "text": {
							text += part.text;
							break;
						}
						case "tool-call": {
							toolCalls.push({
								id: part.toolCallId,
								type: "function",
								function: {
									name: part.toolName,
									arguments:
										typeof part.input === "string"
											? part.input
											: JSON.stringify(part.input),
								},
							});
							break;
						}
						case "tool-result": {
							// Tool results are handled separately in the tool role
							break;
						}
					}
				}

				messages.push({
					role: "assistant",
					content: text,
					tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
				});

				break;
			}

			case "tool": {
				for (const part of message.content) {
					if (part.type === "tool-result") {
						messages.push({
							role: "tool",
							tool_call_id: part.toolCallId,
							content: JSON.stringify(part.output),
						});
					}
				}
				break;
			}

			default: {
				const _exhaustiveCheck: never = message;
				throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
			}
		}
	}

	return messages;
}
