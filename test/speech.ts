import { writeFile } from "node:fs/promises";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { sarvam } from "./sarvam";

const { audio } = await generateSpeech({
	model: sarvam.speech("bulbul:v3", "en-IN", {
		output_audio_codec: "wav",
		speaker: "aayan",
		speech_sample_rate: 24000,
	}),
	text: "नमस्ते everyone, आज हम एक comprehensive test करने जा रहे हैं। This is a very important audio file, क्योंकि इसमें hindi और english दोनों languages mix होंगे। हमें test करना है verbatim mode, जहां um, uh, like इत्यादि fillers भी transcribe होंगे। Translation mode में यह पूरा hindi part अंग्रेजी में translate होगा। Transliteration के लिए हमें hindi को roman script में लिखना होगा, जैसे namaste ke bajai namaskar likha jayega। Code-mixing है तो सब भाषाएं mix हो रही हैं naturally जैसे real conversations में होता है। One, two, three numbers, फिर एक दो तीन hindi numbers भी हैं। The transcription API should handle all these variations properly। हर mode अलग तरीके से काम करेगा - कोई translate करेगा, कोई romanize करेगा, कोई सब कुछ verbatim रखेगा। This comprehensive test audio contains multiple sentence structures, different speaking speeds, और mixed language patterns to thoroughly test all transcription features.",
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
