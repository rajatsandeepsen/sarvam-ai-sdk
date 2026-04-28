/**
 * Smoke test for sarvam-ai-sdk (local package name resolves to this repo).
 * Run: npm test  (loads .env via package.json script)
 */
import { generateText } from "ai";
import { sarvam } from "sarvam-ai-sdk";

if (!process.env.SARVAM_API_KEY?.trim()) {
	console.error(
		"Missing SARVAM_API_KEY. Node does not load .env on its own.\n" +
			"  From the repo root run:  npm test\n" +
			"  Or:  npx tsx --env-file=.env test/index.ts\n" +
			"  Or set the variable in your shell:  export SARVAM_API_KEY=...",
	);
	process.exit(1);
}

console.log("Calling sarvam-30b via AI SDK…");

const { text, usage } = await generateText({
	model: sarvam("sarvam-30b"),
	prompt: 'Reply with exactly one word: "ok"',
});

console.log("Response:", text?.slice(0, 500) ?? "(empty)");
console.log("Usage:", usage);
console.log("Smoke test passed.");
