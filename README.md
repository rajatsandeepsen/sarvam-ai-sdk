# AI SDK - Sarvam Provider

The **[Sarvam provider](https://ai-sdk.dev/providers/ai-sdk-providers/sarvam)** for the [AI SDK](https://ai-sdk.dev/docs)
contains language model support for the Sarvam chat completion, Text-to-Speech and Speech-to-Text APIs.

## Setup

The **[Sarvam](http://sarvam.ai)** provider is available in the `@ai-sdk/sarvam` module. You can install it with

```bash
npm i @ai-sdk/sarvam
```

## Provider Instance

You can import the default provider instance `sarvam` from `@ai-sdk/sarvam`:

```ts
import { sarvam } from '@ai-sdk/sarvam';
```

Create `.env` file with API key from **[Sarvam Dashboard](https://dashboard.sarvam.ai/)**
```bash
SARVAM_API_KEY="your_api_key"
```

## Example

```ts
import { sarvam } from '@ai-sdk/sarvam';
import { generateText } from 'ai';

const { text } = await generateText({
  model: sarvam('sarvam-m'),
  prompt: 'Keep cooking, guys',
});
```

## Text-to-Speech

```ts
import { sarvam } from "@ai-sdk/sarvam";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { writeFile } from "fs/promises";

const result = await generateSpeech({
    model: sarvam.speech("bulbul:v2", "ml-IN"),
    text: "പാചകം തുടരൂ, സുഹൃത്തുക്കളേ",
});

const audioBuffer = Buffer.from(result.audio.base64, "base64")
await writeFile("./src/transcript-test.wav", audioBuffer);
```

## Speech-to-Text

```ts
import { sarvam } from "@ai-sdk/sarvam";
import { experimental_transcribe as transcribe } from "ai";
import { readFile } from "fs/promises";

const result = await transcribe({
    model: sarvam.transcription("saarika:v2", "ml-IN")
    audio: await readFile("./src/transcript-test.wav"),
});

console.log(result.text); // പാചകം തുടരും സുഹൃത്തുക്കളെ
```

## Documentation

Please check out the **[Sarvam provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/sarvam)** and **[Sarvam API documentation](https://docs.sarvam.ai)** for more information.
