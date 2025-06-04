// https://console.sarvam.com/docs/models
export type SarvamChatModelId =
  // production models
  "sarvam-m" | (string & {});

export interface SarvamChatSettings {
    /**
    * Whether to simulate artificial tool calling or JSON object generation, because Sarvam Models doen't support native Tool Calling or JSON Schmea.
    * @default undefined
    * @example
        await generateText({
            model: sarvam("sarvam-m", {
                simulate: "tool-calling"
            })
            tools: {...}
        })

        await generateObject({
            model: sarvam("sarvam-m", {
                simulate: "json-object"
            })
            schema: {...}
        })
    */
    simulate?: "tool-calling" | "json-object"

  /**
   * Whether to enable parallel function calling during tool use.
   * @default true
   */
  parallelToolCalls?: boolean;

  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. Learn more.
   */
  user?: string;

  /**
   * Automatically download images and pass the image as data to the model. Sarvam supports image URLs for public models, so this is only needed for private models or when the images are not publicly accessible.
   * @default false
   */
  downloadImages?: boolean;
}
