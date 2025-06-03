# AI SDK - Sarvam Provider

The **[Sarvam provider](https://ai-sdk.dev/providers/ai-sdk-providers/sarvam)** for the [AI SDK](https://ai-sdk.dev/docs)
contains language model support for the Sarvam chat completion, Text-to-Speech and Speech-to-Text APIs.

## Setup

The **[Sarvam](http://sarvam.ai)** provider is available in the `sarvam-ai-sdk` module. You can install it with

```bash
npm i sarvam-ai-sdk
```

## Provider Instance

You can import the default provider instance `sarvam` from `sarvam-ai-sdk`:

```ts
import { sarvam } from 'sarvam-ai-sdk';
```

Create `.env` file with API key from **[Sarvam Dashboard](https://dashboard.sarvam.ai/)**
```bash
SARVAM_API_KEY="your_api_key"
```

## Example

```ts
import { sarvam } from 'sarvam-ai-sdk';
import { generateText } from 'ai';

const { text } = await generateText({
    model: sarvam("sarvam-m"),
    prompt: "Translate this to malayalam: 'Keep cooking, guys'",
});

console.log(text); // പാചകം തുടരൂ, സുഹൃത്തുക്കളേ
```

## Text-to-Speech

```ts
import { sarvam } from "sarvam-ai-sdk";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { writeFile } from "fs/promises";

const { audio } = await generateSpeech({
    model: sarvam.speech("bulbul:v2", "ml-IN"),
    text: "പാചകം തുടരൂ, സുഹൃത്തുക്കളേ",
});

const audioBuffer = Buffer.from(audio.base64, "base64")
await writeFile("./src/transcript-test.wav", audioBuffer);
```

## Speech-to-Text

```ts
import { sarvam } from "sarvam-ai-sdk";
import { experimental_transcribe as transcribe } from "ai";
import { readFile } from "fs/promises";

const { text } = await transcribe({
    model: sarvam.transcription("saarika:v2", "ml-IN")
    audio: await readFile("./src/transcript-test.wav"),
});

console.log(text); // പാചകം തുടരും സുഹൃത്തുക്കളെ
```

## Translation

> Only transliterates `prompt` and `role:user` messages, not `system` not `assistant`.

```ts
import { sarvam } from "sarvam-ai-sdk";
import { generateText } from "ai";

const result = await generateText({
    model: sarvam.translation({
        "to": "en-IN",
        "from": "ml-IN"
    }),
    prompt: "ഇതൊക്കെ ശ്രദ്ധിക്കണ്ടേ അംബാനെ?",
});

console.log(result.text); // Shouldn't we be careful about this, Ambane?
```

## Transliterate

> Only transliterates `prompt` and `role:user` messages, not `system` not `assistant`.

```ts
import { sarvam } from "sarvam-ai-sdk";
import { generateText } from "ai";

const result = await generateText({
  model: sarvam.transliterate({
      from: "en-IN"
      to: "ml-IN",
  }),
  prompt: "eda mone, happy alle?",
});

console.log(result.text); // എടാ മോനെ, ഹാപ്പി അല്ലേ?
```

## Tool Calling

> [!WARNING]
> Latest `sarvam-m` model isn't trained on native tool calling feature (aka JSON mode). So we simulate this with prompt engineering technique.

```ts
import { z } from "zod";
import { generateText, tool } from "ai";
import { sarvam } from "sarvam-ai-sdk";


const result = await generateText({
  model: sarvam("sarvam-m", {
    simulateToolCalling: true, // ⚠️ important
  }),
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

console.log(result.toolResults);
```

## Documentation

Please check out the **[Sarvam provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/sarvam)** and **[Sarvam API documentation](https://docs.sarvam.ai)** for more information.
