import z from "zod";
import { SarvamLanguageCodeSchema, SarvamScriptCodeSchema } from "../config";

export const sarvamLidResponseSchema = z.object({
	script_code: SarvamScriptCodeSchema.nullish(),
	language_code: SarvamLanguageCodeSchema.nullish(),
	request_id: z.string().nullish(),
});
