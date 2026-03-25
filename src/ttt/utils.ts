import type { LanguageModelV1Prompt } from "ai";

export const convertPromptToInput = (prompt: LanguageModelV1Prompt) => {
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
