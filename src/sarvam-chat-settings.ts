// https://console.sarvam.com/docs/models
export type SarvamChatModelId =
  // production models
  "sarvam-m" | (string & {});

export interface SarvamChatSettings {
  /**
Whether to simulate function calling during tool use, because Sarvam Models doen't support native tool calling yet. Default to false.
   */
  simulateToolCalling?: boolean;

  /**
Whether to enable parallel function calling during tool use. Default to true.
   */
  parallelToolCalls?: boolean;

  /**
A unique identifier representing your end-user, which can help OpenAI to
monitor and detect abuse. Learn more.
*/
  user?: string;

  /**
Automatically download images and pass the image as data to the model.
Sarvam supports image URLs for public models, so this is only needed for
private models or when the images are not publicly accessible.

Defaults to `false`.
   */
  downloadImages?: boolean;
}
