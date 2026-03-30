import type { LanguageModelV3FinishReason } from "@ai-sdk/provider";

export function mapFinishReason(
	finishReason: string | null | undefined,
): LanguageModelV3FinishReason["unified"] {
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
			return "other";
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
