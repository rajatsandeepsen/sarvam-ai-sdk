import type { LanguageModelV3Prompt } from "@ai-sdk/provider";

export const convertPromptToInput = (prompt: LanguageModelV3Prompt) => {
	return prompt
		.filter((m) => m.role === "user")
		.flatMap((m) =>
			m.content
				.filter((c) => c.type === "text")
				.map((c) => c.text.trim())
				.filter((text) => text.length > 0),
		)
		.join("\n");
};
