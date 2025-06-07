import { SarvamLanguageCode } from "./sarvam-config";

export interface SarvamTranslationSettings {
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
    * Specifies the gender of the speaker for better translations.
    * This feature is only supported for code-mixed translation models.
    *
    * @example
        Input: "मैंने कहा कि मैं आऊंगा।"
        Output (male): "I said that I will come."
        Output (female): "I said that I will come."
    */
    speaker_gender?: "Male" | "Female"

    /**
    * Specifies the tone or style of the translation.
    *
    * @example
        Input: "आप कैसे हैं?"
        Output (formal): "How are you?"
        Output (modern-colloquial): "What's up?"
        Output (classic-colloquial): "How art thou?"
        Output (code-mixed): "How are you, bhai?"
    * @default "formal"
    */
    mode?: "formal" | "modern-colloquial" | "classic-colloquial" | "code-mixed"

    /**
    * Specifies the translation model to use.
    *
    * mayura:v1: Supports 12 languages with all modes, output scripts, and automatic language detection.
    *
    * sarvam-translate:v1: Supports all 22 scheduled languages of India, formal mode only
    *
    * @default mayura:v1
    */
    model?: "mayura:v1" | "sarvam-translate:v1"

    /**
    * Enables custom preprocessing of the input text, which can result in better translations.
    *
    * @default false
    */
    enable_preprocessing?: boolean

    /**
    * Controls the transliteration style applied to the output text.
    *
    * @example
        Input: "Your EMI of Rs. 3000 is pending."
        Output (roman): "aapka Rs. 3000 ka EMI pending hai."
        Output (fully-native): "आपका रु. 3000 का ई.एम.ऐ. पेंडिंग है।"
        Output (spoken-form-in-native): "आपका थ्री थाउजेंड रूपीस का ईएमअइ पेंडिंग है।"
    * @default null
    */
    output_script?: "roman" | "fully-native" | "spoken-form-in-native"
}
