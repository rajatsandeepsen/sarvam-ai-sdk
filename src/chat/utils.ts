import type { LanguageModelV2FinishReason } from "@ai-sdk/provider";

export function mapSarvamFinishReason(
	finishReason: string | null | undefined,
): LanguageModelV2FinishReason {
	switch (finishReason) {
		case "stop":
			return "stop";
		case "length":
			return "length";
		case "content_filter":
			return "content-filter";
		case "function_call":
		case "tool_calls":
			return "tool-calls";
		default:
			return "unknown";
	}
}

export function getResponseMetadata({
	id,
	model,
	created,
}: {
	id?: string | undefined | null;
	created?: number | undefined | null;
	model?: string | undefined | null;
}) {
	return {
		id: id ?? undefined,
		modelId: model ?? undefined,
		timestamp: created != null ? new Date(created * 1000) : undefined,
	};
}
