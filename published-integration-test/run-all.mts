/**
 * Integration tests against **published** `sarvam-ai-sdk` from npm (not the repo source).
 * Run from this directory: npm test
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
	experimental_generateSpeech as generateSpeech,
	experimental_transcribe as transcribe,
	generateObject,
	generateText,
	streamText,
	tool,
} from "ai";
import { sarvam } from "sarvam-ai-sdk";
import { z } from "zod";

const require = createRequire(import.meta.url);

if (!process.env.SARVAM_API_KEY?.trim()) {
	console.error("Set SARVAM_API_KEY (e.g. in repo-root ../.env).");
	process.exit(1);
}

const failures: { name: string; error: unknown }[] = [];

async function section(name: string, fn: () => Promise<void>): Promise<void> {
	process.stdout.write(`\n▶ ${name} … `);
	const t0 = Date.now();
	try {
		await fn();
		console.log(`PASS (${Date.now() - t0}ms)`);
	} catch (error) {
		console.log(`FAIL (${Date.now() - t0}ms)`);
		console.error(error);
		failures.push({ name, error });
	}
}

function assert(cond: unknown, msg: string): asserts cond {
	if (!cond) throw new Error(msg);
}

// --- resolved package (must be node_modules, not repo src) ---
const pkgJsonPath = require.resolve("sarvam-ai-sdk/package.json");
const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
	name: string;
	version: string;
};
console.log("Resolved package:", pkg.name, "@", pkg.version);
console.log("From:", pkgJsonPath);
assert(
	pkgJsonPath.includes(`${"node_modules"}/sarvam-ai-sdk`),
	`Expected npm install under node_modules; got: ${pkgJsonPath}`,
);

await section("Chat: generateText (sarvam-30b)", async () => {
	const { text, finishReason } = await generateText({
		model: sarvam("sarvam-30b"),
		prompt: 'Reply with exactly one word in English: "pong"',
		maxRetries: 1,
	});
	assert(text?.toLowerCase().includes("pong"), `Unexpected reply: ${text}`);
	assert(finishReason === "stop", `finishReason: ${finishReason}`);
});

await section("Chat: streamText (sarvam-30b)", async () => {
	const result = streamText({
		model: sarvam("sarvam-30b"),
		prompt: "Say only: stream-ok",
		maxRetries: 1,
	});
	let acc = "";
	for await (const part of result.textStream) {
		acc += part;
		if (acc.length > 200) break;
	}
	const full = acc + (await result.text);
	assert(
		full.toLowerCase().includes("stream") || full.toLowerCase().includes("ok"),
		`Stream output too unexpected: ${full.slice(0, 120)}`,
	);
});

await section("Structured output: generateObject", async () => {
	const { object } = await generateObject({
		model: sarvam("sarvam-30b"),
		schema: z.object({
			answer: z.enum(["yes", "no"]),
		}),
		prompt: 'Is the sky blue on a clear day? Answer JSON with key "answer" only yes or no.',
		maxRetries: 1,
	});
	assert(object.answer === "yes", `Expected yes, got ${object.answer}`);
});

await section("Tool calling", async () => {
	const result = await generateText({
		model: sarvam("sarvam-30b"),
		tools: {
			add: tool({
				description: "Add two integers",
				inputSchema: z.object({ a: z.number(), b: z.number() }),
				execute: async ({ a, b }) => ({ sum: a + b }),
			}),
		},
		toolChoice: "required",
		prompt: "Use the add tool with a=40 and b=2. Do not explain.",
		maxRetries: 1,
	});
	const calls = result.toolCalls ?? [];
	assert(calls.length >= 1, "Expected at least one tool call");
	const addCall = calls.find((c) => c.toolName === "add");
	assert(addCall, "Expected add tool call");
});

await section("Translation (mayura)", async () => {
	const { text } = await generateText({
		model: sarvam.translation("mayura:v1", { from: "ml-IN", to: "en-IN" }),
		prompt: "നമസ്കാരം",
		maxRetries: 1,
	});
	assert(text && text.length > 2, `Empty or short translation: ${text}`);
	assert(
		/[a-zA-Z]/.test(text),
		`Expected some Latin letters in English translation: ${text}`,
	);
});

await section("Transliteration", async () => {
	const { text } = await generateText({
		model: sarvam.transliterate({ to: "ml-IN", from: "en-IN" }),
		prompt: "hello",
		maxRetries: 1,
	});
	assert(text && text.length > 0, "Empty transliteration");
});

await section("Language identification", async () => {
	const { text } = await generateText({
		model: sarvam.languageIdentification(),
		prompt: "ബുദ്ധിയാണ് സാറേ",
		maxRetries: 1,
	});
	const t = (text ?? "").trim();
	assert(/^[a-z]{2}-[A-Z]{2}/i.test(t) || t.includes("IN"), `Unexpected LID: ${t}`);
});

let ttsBytes = 0;
await section("Text-to-speech (bulbul) + Speech-to-text (saaras)", async () => {
	const phrase = "Hello from the published SDK test.";
	const { audio } = await generateSpeech({
		model: sarvam.speech("bulbul:v3", "en-IN"),
		text: phrase,
		outputFormat: "wav",
		maxRetries: 1,
	});
	const buf = Buffer.from(audio.uint8Array);
	ttsBytes = buf.length;
	assert(ttsBytes > 1000, `WAV too small: ${ttsBytes} bytes`);

	const { text } = await transcribe({
		model: sarvam.transcription("saaras:v3", "en-IN"),
		audio: buf,
		maxRetries: 1,
	});
	const normalized = (text ?? "").toLowerCase().replace(/\s+/g, " ");
	assert(
		normalized.includes("hello") || normalized.includes("publish"),
		`STT did not match expected words: ${text}`,
	);
});

console.log(`\nTTS WAV size: ${ttsBytes} bytes`);

if (failures.length) {
	console.error(
		`\n${failures.length} suite(s) failed:`,
		failures.map((f) => f.name).join(", "),
	);
	process.exit(1);
}

console.log("\nAll suites passed.");
