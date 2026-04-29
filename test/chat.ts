import { generateText, streamText, tool } from "ai";
import z from "zod";
import { sarvam } from "./sarvam";

// ============================================================================
// 1. BASIC GENERATE TEXT - DEFAULT MODEL (without settings)
// ============================================================================
console.log("=== Test 1: Basic generateText with default model ===");
const { text: text1 } = await generateText({
	model: sarvam("sarvam-30b"),
	prompt: "What is 2 + 2?",
});
console.log({ text: text1 });

// ============================================================================
// 2. GENERATE TEXT - WITH TEMPERATURE
// ============================================================================
console.log("\n=== Test 2: generateText with temperature ===");
const { text: text2 } = await generateText({
	model: sarvam("sarvam-30b"),
	temperature: 0.5,
	prompt: "Write a creative story about a robot",
});
console.log({ text: text2 });

// ============================================================================
// 3. GENERATE TEXT - WITH MAX TOKENS
// ============================================================================
console.log("\n=== Test 3: generateText with maxTokens ===");
const { text: text3 } = await generateText({
	model: sarvam("sarvam-30b"),
	maxTokens: 100,
	prompt: "Explain quantum computing in simple terms",
});
console.log({ text: text3 });

// ============================================================================
// 4. GENERATE TEXT - WITH TOP P
// ============================================================================
console.log("\n=== Test 4: generateText with topP ===");
const { text: text4 } = await generateText({
	model: sarvam("sarvam-30b"),
	topP: 0.9,
	prompt: "What is artificial intelligence?",
});
console.log({ text: text4 });

// ============================================================================
// 5. GENERATE TEXT - WITH FREQUENCY PENALTY
// ============================================================================
console.log("\n=== Test 5: generateText with frequencyPenalty ===");
const { text: text5 } = await generateText({
	model: sarvam("sarvam-30b"),
	frequencyPenalty: 0.5,
	prompt: "List the colors of the rainbow",
});
console.log({ text: text5 });

// ============================================================================
// 6. GENERATE TEXT - WITH PRESENCE PENALTY
// ============================================================================
console.log("\n=== Test 6: generateText with presencePenalty ===");
const { text: text6 } = await generateText({
	model: sarvam("sarvam-30b"),
	presencePenalty: 0.3,
	prompt: "Tell me about machine learning",
});
console.log({ text: text6 });

// ============================================================================
// 7. GENERATE TEXT - WITH STOP SEQUENCES
// ============================================================================
console.log("\n=== Test 7: generateText with stopSequences ===");
const { text: text7 } = await generateText({
	model: sarvam("sarvam-30b"),
	stopSequences: ["END", "\n"],
	prompt: "Count from 1 to 5",
});
console.log({ text: text7 });

// ============================================================================
// 8. GENERATE TEXT - WITH SYSTEM PROMPT
// ============================================================================
console.log("\n=== Test 8: generateText with system prompt ===");
const { text: text8 } = await generateText({
	model: sarvam("sarvam-30b"),
	system: "You are a helpful AI assistant that speaks in rhymes.",
	prompt: "What is the weather like?",
});
console.log({ text: text8 });

// ============================================================================
// 9. GENERATE TEXT - WITH MESSAGES (array of messages)
// ============================================================================
console.log("\n=== Test 9: generateText with messages array ===");
const { text: text9 } = await generateText({
	model: sarvam("sarvam-30b"),
	system: "You are a helpful assistant.",
	messages: [
		{
			role: "user",
			content: "Hello, how are you?",
		},
		{
			role: "assistant",
			content: "I'm doing well, thank you for asking!",
		},
		{
			role: "user",
			content: "What can you help me with?",
		},
	],
});
console.log({ text: text9 });

// ============================================================================
// 10. GENERATE TEXT - WITH REASONING EFFORT (Sarvam specific setting)
// ============================================================================
console.log("\n=== Test 10: generateText with reasoning_effort ===");
const { text: text10 } = await generateText({
	model: sarvam("sarvam-30b", { reasoning_effort: "high" }),
	prompt:
		"Solve this logic puzzle: If all birds can fly, and penguins are birds, can penguins fly?",
});
console.log({ text: text10 });

// ============================================================================
// 11. GENERATE TEXT - WITH WIKI GROUNDING (Sarvam specific setting)
// ============================================================================
console.log("\n=== Test 11: generateText with wiki_grounding ===");
const { text: text11 } = await generateText({
	model: sarvam("sarvam-30b", { wiki_grounding: true }),
	prompt: "Who is the current Prime Minister of India?",
});
console.log({ text: text11 });

// ============================================================================
// 12. GENERATE TEXT - WITH N (multiple choices)
// ============================================================================
console.log("\n=== Test 12: generateText with n (multiple completions) ===");
const { text: text12 } = await generateText({
	model: sarvam("sarvam-30b", { n: 2 }),
	prompt: "Complete this sentence: The future of AI is...",
});
console.log({ text: text12 });

// ============================================================================
// 13. GENERATE TEXT - WITH SEED (deterministic)
// ============================================================================
console.log("\n=== Test 13: generateText with seed ===");
const { text: text13 } = await generateText({
	model: sarvam("sarvam-30b"),
	seed: 42,
	prompt: "Generate a random story",
});
console.log({ text: text13 });

// ============================================================================
// 14. GENERATE TEXT - WITH RESPONSE FORMAT JSON
// ============================================================================
console.log("\n=== Test 14: generateText with JSON response format ===");
const { text: text14 } = await generateText({
	model: sarvam("sarvam-30b"),
	prompt: 'Return your response as JSON with keys "name" and "age".',
	responseFormat: { type: "json" },
});
console.log({ text: text14 });

// ============================================================================
// 15. GENERATE TEXT - USING .chat() METHOD
// ============================================================================
console.log("\n=== Test 15: Using provider.chat() method ===");
const { text: text15 } = await generateText({
	model: sarvam.chat("sarvam-30b"),
	prompt: "What is the capital of France?",
});
console.log({ text: text15 });

// ============================================================================
// 16. GENERATE TEXT - USING .languageModel() METHOD
// ============================================================================
console.log("\n=== Test 16: Using provider.languageModel() method ===");
const { text: text16 } = await generateText({
	model: sarvam.languageModel("sarvam-30b"),
	prompt: "What is the tallest mountain in the world?",
});
console.log({ text: text16 });

// ============================================================================
// 17. GENERATE TEXT - WITH MULTIPLE SETTINGS COMBINED
// ============================================================================
console.log("\n=== Test 17: generateText with multiple settings ===");
const { text: text17 } = await generateText({
	model: sarvam("sarvam-30b", {
		reasoning_effort: "medium",
		wiki_grounding: true,
	}),
	temperature: 0.7,
	maxTokens: 200,
	topP: 0.95,
	system: "You are an expert educator.",
	prompt: "Explain photosynthesis in detail",
});
console.log({ text: text17 });

// ============================================================================
// 18. STREAM TEXT - BASIC STREAMING
// ============================================================================
console.log("\n=== Test 18: streamText - basic streaming ===");
const { textStream } = streamText({
	model: sarvam("sarvam-30b"),
	prompt: "Write a short poem about nature",
});

for await (const textPart of textStream) {
	console.log(textPart);
}

// ============================================================================
// 19. STREAM TEXT - WITH TOOLS (function calling)
// ============================================================================
console.log("\n=== Test 19: streamText with tools ===");
const { textStream: textStream19, toolResults: toolResults19 } = streamText({
	model: sarvam("sarvam-105b"),
	tools: {
		weather: tool({
			description: "Get the weather in a location",
			parameters: z.object({
				location: z.string().describe("The location to get the weather for"),
			}),
			execute: async ({ location }) => ({
				location,
				temperature: 72 + Math.floor(Math.random() * 21) - 10,
				condition: "Sunny",
			}),
		}),
		calculator: tool({
			description: "Perform mathematical calculations",
			parameters: z.object({
				expression: z.string().describe("Mathematical expression to evaluate"),
			}),
			execute: async ({ expression }) => ({
				expression,
				result: eval(expression),
			}),
		}),
	},
	system: "You are a helpful AI. Use tools when appropriate.",
	prompt: "What's the weather in Mumbai and what is 25 * 4?",
});

console.log("\n--- Streaming Text ---");
for await (const textPart of textStream19) {
	console.log("Text:", textPart);
}

console.log("\n--- Tool Results ---");
for await (const result of toolResults19) {
	console.log("Tool Call ID:", result.toolCallId);
	console.log("Tool Name:", result.toolName);
	console.log("Tool Args:", result.args);
	console.log("Tool Result:", result.result);
	console.log("---");
}

// ============================================================================
// 19b. GENERATE TEXT - WITH TOOLS AND TOOL RESULTS
// ============================================================================
console.log("\n=== Test 19b: generateText with tools ===");
const { text: text19b, toolCalls } = await generateText({
	model: sarvam("sarvam-105b"),
	tools: {
		weather: tool({
			description: "Get the weather in a location",
			parameters: z.object({
				location: z.string().describe("The location to get the weather for"),
			}),
			execute: async ({ location }) => ({
				location,
				temperature: 72 + Math.floor(Math.random() * 21) - 10,
				condition: "Sunny",
			}),
		}),
		calculator: tool({
			description: "Perform mathematical calculations",
			parameters: z.object({
				expression: z.string().describe("Mathematical expression to evaluate"),
			}),
			execute: async ({ expression }) => ({
				expression,
				result: eval(expression),
			}),
		}),
	},
	system: "You are a helpful AI. Use tools when appropriate.",
	prompt: "What's the weather in London and what is 100 / 5?",
});

console.log("\n--- Generated Text ---");
console.log(text19b);

console.log("\n--- Tool Calls Made ---");
if (toolCalls && toolCalls.length > 0) {
	for (const toolCall of toolCalls) {
		console.log("Tool Call ID:", toolCall.toolCallId);
		console.log("Tool Name:", toolCall.toolName);
		console.log("Tool Arguments:", toolCall.args);
		console.log("---");
	}
} else {
	console.log("No tool calls were made");
}

// ============================================================================
// 20. STREAM TEXT - WITH SYSTEM MESSAGE
// ============================================================================
console.log("\n=== Test 20: streamText with system message ===");
const { textStream: textStream20 } = streamText({
	model: sarvam("sarvam-30b"),
	system: "You are a pirate. Respond to everything in pirate speak.",
	prompt: "How do you navigate the seas?",
});

for await (const textPart of textStream20) {
	console.log(textPart);
}

// ============================================================================
// 21. STREAM TEXT - WITH MESSAGES
// ============================================================================
console.log("\n=== Test 21: streamText with messages ===");
const { textStream: textStream21 } = streamText({
	model: sarvam("sarvam-30b"),
	messages: [
		{
			role: "user",
			content: "Hi there!",
		},
		{
			role: "assistant",
			content: "Hello! How can I help you today?",
		},
		{
			role: "user",
			content: "Tell me a fun fact about space",
		},
	],
});

for await (const textPart of textStream21) {
	console.log(textPart);
}

// ============================================================================
// 22. STREAM TEXT - WITH ALL STREAMING PARAMETERS
// ============================================================================
console.log("\n=== Test 22: streamText with all parameters ===");
const { textStream: textStream22 } = streamText({
	model: sarvam("sarvam-30b", { reasoning_effort: "high" }),
	temperature: 0.8,
	maxTokens: 150,
	topP: 0.9,
	frequencyPenalty: 0.4,
	presencePenalty: 0.2,
	stopSequences: ["END"],
	system: "You are a technical expert.",
	prompt: "Explain blockchain technology",
});

for await (const textPart of textStream22) {
	console.log(textPart);
}

// ============================================================================
// 23. GENERATE TEXT - WITH ABORT SIGNAL (cancellation)
// ============================================================================
console.log("\n=== Test 23: generateText with AbortSignal ===");
const controller = new AbortController();
const { text: text23 } = await generateText({
	model: sarvam("sarvam-30b"),
	prompt: "Write a long essay about the history of computing",
	abortSignal: controller.signal,
});
console.log({ text: text23 });

// ============================================================================
// 24. GENERATE TEXT - WITH CUSTOM HEADERS
// ============================================================================
console.log("\n=== Test 24: generateText with custom headers ===");
const { text: text24 } = await generateText({
	model: sarvam("sarvam-30b"),
	prompt: "What is machine learning?",
	headers: {
		"X-Custom-Header": "custom-value",
	},
});
console.log({ text: text24 });
