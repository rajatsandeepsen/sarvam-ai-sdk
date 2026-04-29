import { readFile } from "node:fs/promises";
import { experimental_transcribe as transcribe } from "ai";
import { sarvam } from "./sarvam";

const audioBuffer = await readFile("./test/transcript-test.wav");

// Test 1: Basic transcription in English
console.log("Test 1: Basic transcription (English)");
const test1 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
});
console.log("Result:", test1.text);
console.log("Language:", test1.language);
console.log("---\n");

// Test 2: Transcription with translate mode
console.log("Test 2: Transcription with translate mode");
const test2 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
	providerOptions: {
		sarvam: {
			mode: "translate",
		},
	},
});
console.log("Result:", test2.text);
console.log("---\n");

// Test 3: Transcription with timestamps
console.log("Test 3: Transcription with timestamps");
const test3 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
	providerOptions: {
		sarvam: {
			with_timestamps: true,
		},
	},
});
console.log("Result:", test3.text);
console.log("Duration (seconds):", test3.durationInSeconds);
console.log("---\n");

// Test 4: Transcription with verbatim mode
console.log("Test 4: Transcription with verbatim mode");
const test4 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
	providerOptions: {
		sarvam: {
			mode: "verbatim",
		},
	},
});
console.log("Result:", test4.text);
console.log("---\n");

// Test 5: Transcription with translit mode
console.log("Test 5: Transcription with translit mode");
const test5 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
	providerOptions: {
		sarvam: {
			mode: "translit",
		},
	},
});
console.log("Result:", test5.text);
console.log("---\n");

// Test 6: Transcription with codemix mode
console.log("Test 6: Transcription with codemix mode");
const test6 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
	providerOptions: {
		sarvam: {
			mode: "codemix",
		},
	},
});
console.log("Result:", test6.text);
console.log("---\n");

// Test 7: Transcription with timestamps and translate mode
console.log("Test 7: Transcription with translate mode and timestamps");
const test7 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
	providerOptions: {
		sarvam: {
			mode: "translate",
			with_timestamps: true,
		},
	},
});
console.log("Result:", test7.text);
console.log("Duration (seconds):", test7.durationInSeconds);
console.log("---\n");

// Test 8: Transcription with timestamps and verbatim mode
console.log("Test 8: Transcription with verbatim mode and timestamps");
const test8 = await transcribe({
	model: sarvam.transcription("saaras:v3", "en-IN"),
	audio: audioBuffer,
	providerOptions: {
		sarvam: {
			mode: "verbatim",
			with_timestamps: true,
		},
	},
});
console.log("Result:", test8.text);
console.log("Duration (seconds):", test8.durationInSeconds);
console.log("---\n");

console.log("✅ All core transcription tests completed!");
