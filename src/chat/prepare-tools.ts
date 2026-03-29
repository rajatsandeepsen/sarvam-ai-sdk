import {
	type LanguageModelV2CallWarning,
	type LanguageModelV2FunctionTool,
	type LanguageModelV2ProviderDefinedTool,
	type LanguageModelV2ToolChoice,
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
	tools,
	toolChoice,
}: {
	tools?: Array<
		LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool
	>;
	toolChoice?: LanguageModelV2ToolChoice;
}): {
	tools: SarvamTools | undefined;
	tool_choice:
		| { type: "function"; function: { name: string } }
		| "auto"
		| "none"
		| "required"
		| undefined;
	toolWarnings: LanguageModelV2CallWarning[];
} {
	// when the tools array is empty, change it to undefined to prevent errors:
	const finalTools = tools?.length ? tools : undefined;
	const toolWarnings: LanguageModelV2CallWarning[] = [];

	if (finalTools == null) {
		return { tools: undefined, tool_choice: undefined, toolWarnings };
	}

	const sarvamTools: SarvamTools = [];

	for (const tool of finalTools) {
		if (tool.type === "provider-defined") {
			toolWarnings.push({ type: "unsupported-tool", tool });
		} else {
			sarvamTools.push({
				type: "function",
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema,
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
