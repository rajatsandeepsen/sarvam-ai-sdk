import { generateObject, generateText, Output } from "ai";
import { z } from "zod";
import { sarvam } from "./sarvam";

const { object } = await generateObject({
	model: sarvam("sarvam-30b"),
	schemaName: "Recipe",
	schemaDescription: "A recipe with a name, ingredients and steps",
	schema: z.object({
		recipe: z.object({
			name: z.string(),
			ingredients: z.array(z.string()),
			steps: z.array(z.string()),
		}),
	}),
	prompt: "Generate a South Indian recipe, in Malayalam",
});

console.log({ object });

const { output } = await generateText({
	model: sarvam("sarvam-105b"),
	output: Output.object({
		name: "Recipe",
		description: "A recipe with a name, ingredients and steps",
		schema: z.object({
			recipe: z.object({
				name: z.string(),
				ingredients: z.array(z.string()),
				steps: z.array(z.string()),
			}),
		}),
	}),
	prompt: "Generate a South Indian recipe, in Malayalam",
});

console.log(output);

const { text } = await generateText({
	model: sarvam("sarvam-105b"),
	prompt: "Translate this to malayalam: 'Keep cooking, guys'",
});

console.log({ text });

import { tool } from "ai";

const { toolResults } = await generateText({
	model: sarvam("sarvam-30b"),
	tools: {
		weather: tool({
			description: "Get the weather in a location",
			inputSchema: z.object({
				location: z.string(),
			}),
			execute: async ({ location }) => ({
				location,
				temperature: 72 + Math.floor(Math.random() * 21) - 10,
			}),
		}),
	},
	system: "Your are a helpful AI",
	prompt: "കൊച്ചിയിലെ കാലാവസ്ഥ എന്താണ്?",
});

console.log(toolResults);
