# Package
# AI SDK - Sarvam Provider

The **[Sarvam provider](https://v4.ai-sdk.dev/providers/ai-sdk-providers/sarvam)** for the [AI SDK](https://v4.ai-sdk.dev/docs)
contains language model support for the Sarvam chat completion, Text-to-Speech and Speech-to-Text APIs.

## Setup

The **[Sarvam](http://sarvam.ai)** provider is available in the `sarvam-ai-sdk` module. You can install it with

```bash
npm i sarvam-ai-sdk ai@4
```

> [!WARNING]
> This package only works with Vercel AI-SDK v4, not latest v6. Make sure to install `ai@4` in your project.

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
	model: sarvam("sarvam-30b"),
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
    model: sarvam.speech("bulbul:v3", "ml-IN"),
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
    model: sarvam.transcription("saarika:v2.5", "ml-IN"),
    audio: await readFile("./src/transcript-test.wav"),
});

console.log(text); // പാചകം തുടരും സുഹൃത്തുക്കളെ
```

```ts
import { sarvam } from "sarvam-ai-sdk";
import { experimental_transcribe as transcribe } from "ai";
import { readFile } from "fs/promises";

const { text } = await transcribe({
    model: sarvam.transcription("saaras:v3", "en-IN"),
    audio: await readFile("./src/transcript-test.wav"),
});

console.log(text); // Pachakam thudaroo, suhruthukkale.
```

## Speech-to-Text-Translate

```ts
import { sarvam } from "sarvam-ai-sdk";
import { experimental_transcribe as transcribe } from "ai";
import { readFile } from "fs/promises";

const result = await transcribe({
    model: sarvam.speechTranslation("saaras:v2.5"),
    audio: await readFile("./src/transcript-test.wav"),
});

console.log(result.text); // Cooking continues, my friends
```

## Translation

> NB: Only transliterates `prompt` and `role:user` messages, not `role:system` not `role:assistant`.

```ts
import { sarvam } from "sarvam-ai-sdk";
import { generateText } from "ai";

const result = await generateText({
	model: sarvam.translation("mayura:v1", {
        "from": "ml-IN",
        "to": "en-IN",
    }),
    prompt: "ഇതൊക്കെ ശ്രദ്ധിക്കണ്ടേ അംബാനെ?",
});

console.log(result.text); // Shouldn't we be careful about this, Ambane?
```

## Transliterate

> NB: Only transliterates `prompt` and `role:user` messages, not `role:system` not `role:assistant`.

```ts
import { sarvam } from "sarvam-ai-sdk";
import { generateText } from "ai";

const result = await generateText({
  model: sarvam.transliterate({
      to: "ml-IN",
      from: "en-IN", // optional
  }),
  prompt: "eda mone, happy alle?",
});

console.log(result.text); // എടാ മോനെ, ഹാപ്പി അല്ലേ?
```

## Language Identification

> NB: Only identifies `prompt` and `role:user` messages, not `role:system` not `role:assistant`.

```ts
import { sarvam } from "sarvam-ai-sdk";
import { generateText } from "ai";

const result = await generateText({
    model: sarvam.languageIdentification(),
    prompt: "ബുദ്ധിയാണ് സാറേ ഇവൻ്റെ മെയിൻ",
});

console.log(result.text); // ml-IN
```

## Tool Calling

```ts
import { z } from "zod";
import { generateText, tool } from "ai";
import { sarvam } from "sarvam-ai-sdk";


const result = await generateText({
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

console.log(result.toolResults);
```

> [!WARNING]
> Old `sarvam-m` models isn't trained on native tool calling feature (aka JSON mode). So we recommend using latest models.

## Generate JSON object

```ts
import { z } from "zod";
import { sarvam } from "sarvam-ai-sdk";
import { generateObject } from 'ai';

const { object } = await generateObject({
  model: sarvam("sarvam-30b"),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a South Indian recipe, in Malayalam',
});

console.log(object);
```

> [!WARNING]
> Old `sarvam-m` models isn't trained on native JSON object generation. So we recommend using latest models.

## All APIs

```ts
import { sarvam } from "sarvam-ai-sdk";

// Text-to-Text + Chat Completion
sarvam("sarvam-105b");
sarvam.languageModel("sarvam-30b");

// Text-to-Text + Transliteration
sarvam.transliterate({ to: "ml-IN", from: "en-IN" });

// Text-to-Text + Translation
sarvam.translation("mayura:v1", { from: "en-IN", to: "ml-IN" });

// Text-to-Text + Language identification
sarvam.languageIdentification();

// Text-to-Speech
sarvam.speech("bulbul:v3", "ml-IN");

// Speech-to-Text + Transcribe to same language
sarvam.transcription("saarika:v2.5");

// Speech-to-Text + Translate to English
sarvam.speechTranslation("saaras:v3");
```


## Documentation

Please check out the **[Sarvam provider documentation](https://v4.ai-sdk.dev/providers/ai-sdk-providers/sarvam)** and **[Sarvam API documentation](https://docs.sarvam.ai)** for more information.
