import {
	type LanguageModelV1,
	type LanguageModelV1CallWarning,
	UnsupportedFunctionalityError,
} from "@ai-sdk/provider";

type SarvamTools = Array<{
	type: "function";
	function: {
		name: string;
		description: string | undefined;
		parameters: unknown;
	};
}>;

export function prepareTools({
	mode,
}: {
	mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
		type: "regular";
	};
}): {
	tools:
		| undefined
		| Array<{
				type: "function";
				function: {
					name: string;
					description: string | undefined;
					parameters: unknown;
				};
		  }>;
	tool_choice:
		| { type: "function"; function: { name: string } }
		| "auto"
		| "none"
		| "required"
		| undefined;
	toolWarnings: LanguageModelV1CallWarning[];
	fakeTools?: string;
} {
	// when the tools array is empty, change it to undefined to prevent errors:
	const tools = mode.tools?.length ? mode.tools : undefined;
	const toolWarnings: LanguageModelV1CallWarning[] = [];

	if (tools == null) {
		return { tools: undefined, tool_choice: undefined, toolWarnings };
	}

	const toolChoice = mode.toolChoice;

	const sarvamTools: SarvamTools = [];

	for (const tool of tools) {
		if (tool.type === "provider-defined") {
			toolWarnings.push({ type: "unsupported-tool", tool });
		} else {
			sarvamTools.push({
				type: "function",
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.parameters,
				},
			});
		}
	}

	if (toolChoice == null) {
		return { tools: sarvamTools, tool_choice: undefined, toolWarnings };
	}

	const type = toolChoice.type;

	switch (type) {
		case "auto":
		case "none":
		case "required":
			return { tools: sarvamTools, tool_choice: type, toolWarnings };
		case "tool":
			return {
				tools: sarvamTools,
				tool_choice: {
					type: "function",
					function: {
						name: toolChoice.toolName,
					},
				},
				toolWarnings,
			};
		default: {
			const _exhaustiveCheck: never = type;
			throw new UnsupportedFunctionalityError({
				functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`,
			});
		}
	}
}

export const parseInnerJSON = (text: string) => {
	const jsonRegex = /```json\s*([\s\S]*?)\s*```/i;
	const jsonMatches = text.match(jsonRegex);

	if (jsonMatches && jsonMatches[1]) {
		return jsonMatches[1];
	}
	return text;
};
