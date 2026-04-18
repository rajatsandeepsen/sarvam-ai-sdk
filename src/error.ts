import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod";

export const sarvamErrorDataSchema = z.object({
	error: z.object({
		request_id: z.string().nullable().optional(),
		message: z.string(),
		code: z.string(),
	}),
});

export type SarvamErrorData = z.infer<typeof sarvamErrorDataSchema>;

export const sarvamFailedResponseHandler = createJsonErrorResponseHandler({
	errorSchema: sarvamErrorDataSchema,
	errorToMessage: (data) => data.error.message,
});
