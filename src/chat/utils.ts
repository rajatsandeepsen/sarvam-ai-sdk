import type { LanguageModelV3FinishReason } from "@ai-sdk/provider";

export function mapSarvamFinishReason(
	finishReason: string | null | undefined,
): LanguageModelV3FinishReason {
	switch (finishReason) {
		case "stop":
			return { unified: "stop", raw: finishReason };
		case "length":
			return { unified: "length", raw: finishReason };
		case "content_filter":
			return { unified: "content-filter", raw: finishReason };
		case "function_call":
		case "tool_calls":
			return { unified: "tool-calls", raw: finishReason };
		default:
			return { unified: "other", raw: finishReason ?? undefined };
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
