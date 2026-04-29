<a href="https://github.com/rajatsandeepsen/sarvam-ai-sdk">
    <img alt="cover" src="https://github.com/rajatsandeepsen/sarvam-ai-sdk/blob/master/cover.png?raw=true" />
</a>

# AI SDK - Sarvam Provider

The **[Sarvam provider](https://v6.ai-sdk.dev/providers/community-providers/sarvam)** for the [AI SDK](https://v6.ai-sdk.dev/docs)
contains language model support for the Sarvam chat completion, Text-to-Speech and Speech-to-Text APIs.

## Setup

The **[Sarvam](http://sarvam.ai)** provider is available in the `sarvam-ai-sdk` module. You can install it with

```bash
npm i sarvam-ai-sdk ai@6
```

> [!WARNING]
> This package only works with Vercel AI-SDK v6, not v7. Make sure to install `ai@6` in your project.

### Version Compatibility

| Sarvam AI SDK Version | Vercel AI SDK Version |
|-----------------------|-----------------------|
| 0.4.x (beta)			| 7.x.x (beta)			|
| 0.3.x (current)		| 6.x.x (current)		|
| 0.2.x					| 5.x.x					|
| 0.1.x					| 4.x.x					|

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
    model: sarvam.transcription("saaras:v3", "en-IN"),
    audio: await readFile("./src/transcript-test.wav"),
});

console.log(text); // Pachakam thudaroo, suhruthukkale.
```

## Translation

> NB: Only translates `prompt` and `role:user` messages, not `role:system` not `role:assistant`.

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
      inputSchema: z.object({
		location: z.string(),
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

## Generate JSON object
> NB: `generateObject` is deprecated, use `generateText` with `Output` tool.

```ts
import { z } from "zod";
import { sarvam } from "sarvam-ai-sdk";
import { generateObject } from "ai";

const { object } = await generateObject({
	model: sarvam("sarvam-30b"),
	schemaName: "Recipe",
	schemaDescription: "A recipe with a name, ingredients and steps",
	schema: z.object({
		recipe: z.object({
			name: z.string(),
			ingredients: z.array(z.string()),
			steps: z.array(z.string()),
		}),
	}),
	prompt: "Generate a South Indian recipe, in Malayalam",
});

console.log(object);
```

## Generating Structured Outputs

```ts
import { z } from "zod";
import { sarvam } from "sarvam-ai-sdk";
import { generateText, Output } from "ai";

const { output } = await generateText({
	model: sarvam("sarvam-105b"),
	output: Output.object({
		name: "Recipe",
		description: "A recipe with a name, ingredients and steps",
		schema: z.object({
			recipe: z.object({
				name: z.string(),
				ingredients: z.array(z.string()),
				steps: z.array(z.string()),
			}),
		}),
	}),
	prompt: "Generate a South Indian recipe, in Malayalam",
});

console.log(output);
```

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

// Speech-to-Text
sarvam.transcription("saaras:v3");
```


## Documentation

Please check out the **[Sarvam provider documentation](https://v6.ai-sdk.dev/providers/community-providers/sarvam)** and **[Sarvam API documentation](https://docs.sarvam.ai)** for more information.
