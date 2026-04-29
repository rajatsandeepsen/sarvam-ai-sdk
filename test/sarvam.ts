import { createSarvam } from "../src";

export const sarvam = createSarvam({
	// @ts-expect-error
	fetch: (input: RequestInfo, init?: RequestInit) => {
		console.log("Fetch called with:", input, init);
		// throw new Error("Stop");
		return fetch(input, init);
	},
});
