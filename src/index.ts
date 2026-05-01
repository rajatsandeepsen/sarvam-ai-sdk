export type { SarvamProviderSettings } from "./config";
export { createSarvam, sarvam } from "./provider";
export type { SarvamSpeechStreamResult } from "./tts/speech-model";
export {
	streamSpeech,
	type StreamSpeechOptions,
	type StreamSpeechResult,
} from "./tts/stream-speech";
export type { SarvamProvider } from "./type";
