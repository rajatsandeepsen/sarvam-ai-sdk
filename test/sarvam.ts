import { createSarvam } from "../src";

export const sarvam = createSarvam({
	fetch: (input: RequestInfo, init?: RequestInit) => {
		console.log("Fetch called with:", input, init);
		// throw new Error("Fetch is not implemented in this test environment.");
		return fetch(input, init);
	},
});
