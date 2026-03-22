import z from "zod";

export type SpeechTranslationModelId =
	| "saaras:v3"
	| "saaras:v2.5"
	| (string & {});

export const speechTranslationResponseSchema = z.object({
	request_id: z.string().nullable(),
	transcript: z.string(),
	language_code: z.string().nullable(),
	// timestamps: z
	//   .object({
	//     end_time_seconds: z.array(z.number()),
	//     start_time_seconds: z.array(z.number()),
	//     words: z.array(z.string()),
	//   })
	//   .optional(),
	diarized_transcript: z
		.object({
			entries: z.array(
				z.object({
					end_time_seconds: z.array(z.number()),
					start_time_seconds: z.array(z.number()),
					transcript: z.string(),
					speaker_id: z.string(),
				}),
			),
		})
		.nullable()
		.optional(),
});
