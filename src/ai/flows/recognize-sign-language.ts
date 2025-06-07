// 'use server'

'use server';

/**
 * @fileOverview Recognizes sign language from a camera feed and displays the corresponding text.
 *
 * - recognizeSignLanguage - A function that handles the sign language recognition process.
 * - RecognizeSignLanguageInput - The input type for the recognizeSignLanguage function.
 * - RecognizeSignLanguageOutput - The return type for the recognizeSignLanguage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecognizeSignLanguageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a hand signing, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RecognizeSignLanguageInput = z.infer<typeof RecognizeSignLanguageInputSchema>;

const RecognizeSignLanguageOutputSchema = z.object({
  recognizedText: z
    .string()
    .describe('The recognized text corresponding to the sign language input.'),
});
export type RecognizeSignLanguageOutput = z.infer<typeof RecognizeSignLanguageOutputSchema>;

export async function recognizeSignLanguage(
  input: RecognizeSignLanguageInput
): Promise<RecognizeSignLanguageOutput> {
  return recognizeSignLanguageFlow(input);
}

const recognizeSignLanguagePrompt = ai.definePrompt({
  name: 'recognizeSignLanguagePrompt',
  input: {schema: RecognizeSignLanguageInputSchema},
  output: {schema: RecognizeSignLanguageOutputSchema},
  prompt: `You are an expert in sign language translation.

You will receive an image of a hand signing, and you will output the corresponding text.

Sign Image: {{media url=photoDataUri}}`,
});

const recognizeSignLanguageFlow = ai.defineFlow(
  {
    name: 'recognizeSignLanguageFlow',
    inputSchema: RecognizeSignLanguageInputSchema,
    outputSchema: RecognizeSignLanguageOutputSchema,
  },
  async input => {
    const {output} = await recognizeSignLanguagePrompt(input);
    return output!;
  }
);
