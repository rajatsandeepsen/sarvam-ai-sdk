import { writeFile } from "node:fs/promises";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { sarvam } from "./sarvam";

const { audio } = await generateSpeech({
	model: sarvam.speech("bulbul:v3", "en-IN", {
		output_audio_codec: "wav",
		speaker: "aayan",
		speech_sample_rate: 24000,
	}),
	text: "नमस्ते everyone। This is a test audio file with hindi और english mix। हमें test करना है verbatim mode, translation, transliteration, और codemix। One two three, एक दो तीन। The API should handle all modes properly।",
	voice: "manisha2",
	speed: 1.0,
	outputFormat: "wav",
	providerOptions: {
		sarvam: {
			speaker: "aayan",
			pitch: 0.2,
			loudness: 2.0,
			speech_sample_rate: 22050,
		},
	},
});

const audioBuffer = Buffer.from(audio.base64, "base64");
await writeFile("./test/transcript-test.wav", audioBuffer);
console.log("✅ Test audio file generated successfully!");
