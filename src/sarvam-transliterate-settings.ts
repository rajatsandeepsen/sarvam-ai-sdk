import { SarvamLanguageCode } from "./sarvam-config";

export interface SarvamTransliterateSettings {
    /**
    * The language code of the input text. This specifies the source language for transliteration.
    *
    * @defualt "auto"
    */
    from?: SarvamLanguageCode | "auto",
    /**
    * The language code of the transliteration text. This specifies the target language for transliteration.
    */
    to: SarvamLanguageCode,

    /**
    * If `international` format is selected, we use regular numerals (0-9). For example: मेरा phone number है: 9840950950
    *
    * If `native` format is selected, we use language-specific native numerals, like: मेरा phone number है: ९८४०९५०९५०
    *
    * @default "international"
    */
    numerals_format?: "native" | "international"

    /**
    * Converts text into a natural spoken form when True. Note: No effect if output language is en-IN.
    * @example
        Input: मुझे कल 9:30am को appointment है
        Output: मुझे कल सुबह साढ़े नौ बजे को अपॉइंटमेंट है
    * @default false
    */
    spoken_form?: boolean

    /**
    * only works when `spoken_form` is true
    *
    *    If `english`, Numbers in the text will be spoken in English.
    *
    *    If `native`, Numbers in the text will be spoken in the native language.
    * @example
        Input: “मेरे पास ₹200 है”
        Output:
             “मेरे पास टू हन्डर्ड रूपीस है” (If english format is selecte)
             “मेरे पास दो सौ रुपये है” (If native format is selected)
    * @default "native"
    */
    spoken_form_numerals_language?: "english" | "native"
}
