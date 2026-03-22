import { z } from "zod";
import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";

export const sarvamErrorDataSchema = z.object({
    error: z.object({
        message: z.string(),
        type: z.string(),
    }),
});

export type SarvamErrorData = z.infer<typeof sarvamErrorDataSchema>;

export const sarvamFailedResponseHandler = createJsonErrorResponseHandler({
    errorSchema: sarvamErrorDataSchema,
    errorToMessage: (data) => data.error.message,
});
