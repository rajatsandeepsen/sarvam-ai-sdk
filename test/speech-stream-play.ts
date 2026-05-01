import { spawn } from "node:child_process";
import { streamSpeech } from "../src";
import { sarvam } from "./sarvam";

const start = Date.now();
let firstChunkAt: number | null = null;
let chunkCount = 0;

const { audioStream } = await streamSpeech({
	model: sarvam.speech("bulbul:v3", "en-IN"),
	text: "नमस्ते everyone। This is a real-time streaming TTS demo. आप सुनेंगे कि audio playback तभी शुरू होता है जैसे ही पहला chunk आता है — full synthesis के लिए wait नहीं करना पड़ता. The sentence keeps going to make the streaming effect obvious.",
	voice: "aayan",
	outputFormat: "mp3",
});

const player = spawn("ffplay", [
	"-nodisp",
	"-autoexit",
	"-loglevel",
	"error",
	"-i",
	"pipe:0",
]);

player.on("error", (err) => {
	console.error(
		"ffplay not found — install ffmpeg: `brew install ffmpeg`. Error:",
		err.message,
	);
	process.exit(1);
});

await audioStream.pipeTo(
	new WritableStream<Uint8Array>({
		write(chunk) {
			const now = Date.now();
			if (firstChunkAt === null) {
				firstChunkAt = now;
				console.log(`First byte at +${now - start}ms (audio should start now)`);
			}
			chunkCount++;
			player.stdin.write(chunk);
		},
		close() {
			player.stdin.end();
			console.log(
				`Last byte at +${Date.now() - start}ms (${chunkCount} chunks)`,
			);
		},
		abort(err) {
			player.kill();
			throw err;
		},
	}),
);

await new Promise<void>((resolve) => player.once("close", () => resolve()));
