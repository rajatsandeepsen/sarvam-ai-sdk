# AI SDK - Sarvam Provider

The **[Sarvam provider](https://ai-sdk.dev/providers/ai-sdk-providers/sarvam)** for the [AI SDK](https://ai-sdk.dev/docs)
contains language model support for the Sarvam chat and completion APIs and embedding model support for the Sarvam embeddings API.

## Setup

The Sarvam provider is available in the `@ai-sdk/sarvam` module. You can install it with

```bash
npm i @ai-sdk/sarvam
```

## Provider Instance

You can import the default provider instance `sarvam` from `@ai-sdk/sarvam`:

```ts
import { sarvam } from '@ai-sdk/sarvam';
```

## Example

```ts
import { sarvam } from '@ai-sdk/sarvam';
import { generateText } from 'ai';

const { text } = await generateText({
  model: sarvam('gemma2-9b-it'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

## Documentation

Please check out the **[Sarvam provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/sarvam)** for more information.
