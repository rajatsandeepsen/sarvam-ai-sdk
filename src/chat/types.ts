export type SarvamChatPrompt = Array<SarvamMessage>;

export type SarvamMessage =
	| SarvamSystemMessage
	| SarvamUserMessage
	| SarvamAssistantMessage
	| SarvamToolMessage;

export interface SarvamSystemMessage {
	role: "system";
	content: string;
}

export interface SarvamUserMessage {
	role: "user";
	content: string | Array<SarvamContentPart>;
}

export type SarvamContentPart = SarvamContentPartText | SarvamContentPartImage;

export interface SarvamContentPartImage {
	type: "image_url";
	image_url: { url: string };
}

export interface SarvamContentPartText {
	type: "text";
	text: string;
}

export interface SarvamAssistantMessage {
	role: "assistant";
	content?: string | null;
	tool_calls?: Array<SarvamMessageToolCall>;
}

export interface SarvamMessageToolCall {
	type: "function";
	id: string;
	function: {
		arguments: string;
		name: string;
	};
}

export interface SarvamToolMessage {
	role: "tool";
	content: string;
	tool_call_id: string;
}
