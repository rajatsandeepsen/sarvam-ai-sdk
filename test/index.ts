import { generateText } from "ai";
import { createSarvam, sarvam } from "../src";

// const sarvam = createSarvam({
// 	apiKey: process.env.SARVAM_API_KEY!,
// });

const { text } = await generateText({
	model: sarvam("sarvam-105b"),
	prompt: "Translate this to malayalam: 'Keep cooking, guys'",
});

console.log({ text }); // പാചകം തുടരൂ, സുഹൃത്തുക്കളേ

// throw new Error("Stop here");

import { experimental_generateSpeech as generateSpeech } from "ai";
import { writeFile } from "fs/promises";

const { audio } = await generateSpeech({
	model: sarvam.speech("bulbul:v2", "ml-IN"),
	text: "പാചകം തുടരൂ, സുഹൃത്തുക്കളേ",
});

const audioBuffer = Buffer.from(audio.base64, "base64");
await writeFile("./test/transcript-test.wav", audioBuffer);
console.log("Speech generated");

import { experimental_transcribe as transcribe } from "ai";
import { readFile } from "fs/promises";

const { text: transcription } = await transcribe({
	model: sarvam.transcription("saaras:v3"),
	audio: await readFile("./test/transcript-test.wav"),
});

console.log({ transcription }); // പാചകം തുടരും സുഹൃത്തുക്കളെ

const { text: speechTranslation } = await transcribe({
	model: sarvam.speechTranslation("saaras:v2.5"),
	audio: await readFile("./test/transcript-test.wav"),
});

console.log({ speechTranslation }); // Cooking continues, my friends

const { text: translation } = await generateText({
	model: sarvam.translation("mayura:v1", {
		from: "ml-IN",
		to: "en-IN",
	}),
	prompt: "ഇതൊക്കെ ശ്രദ്ധിക്കണ്ടേ അംബാനെ?",
});

console.log({ translation }); // Shouldn't we be careful about this, Ambane?

const { text: transliterate } = await generateText({
	model: sarvam.transliterate({
		from: "en-IN",
		to: "ml-IN",
	}),
	prompt: "eda mone, happy alle?",
});

console.log({ transliterate }); // എടാ മോനെ, ഹാപ്പി അല്ലേ?

const { text: languageIdentification } = await generateText({
	model: sarvam.languageIdentification(),
	prompt: "ബുദ്ധിയാണ് സാറേ ഇവൻ്റെ മെയിൻ",
});

console.log({ languageIdentification }); // ml-IN

import { tool } from "ai";
import { z } from "zod";

const { toolResults } = await generateText({
	model: sarvam("sarvam-30b"),
	tools: {
		weather: tool({
			description: "Get the weather in a location",
			parameters: z.object({
				location: z.string().describe("The location to get the weather for"),
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

console.log({ toolResults });

import { generateObject } from "ai";

const { object } = await generateObject({
	model: sarvam("sarvam-30b"),
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
