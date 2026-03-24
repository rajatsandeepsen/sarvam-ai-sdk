import type { LanguageModelV1Prompt } from "ai";

export const convertPromptToInput = (prompt: LanguageModelV1Prompt) =>
	prompt
		.filter((m) => m.role === "user")
		.map((m) => m.content.filter((c) => c.type === "text"))
		.join("\n");
