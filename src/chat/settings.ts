// https://console.sarvam.com/docs/models

/**
 * @description Production models
 */
export type ChatModelId =
	| "sarvam-30b"
	| "sarvam-30b-16k"
	| "sarvam-105b"
	| "sarvam-105b-32k"
	| (string & {});

export interface ChatSettings {
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
