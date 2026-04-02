// Shared language and formatting instructions for prompts
export const getFormattingAndLanguageSection = (): string => {
  return `
### Formatting and Language
- Respond in the specified language: ${navigator.language || (navigator as any).userLanguage}.
- Do not translate proper nouns, technical terms, or code snippets. Retain them in their original form.
- Use clear headings, bullet points, and bold text to enhance readability.`;
};

// Utility function to append formatting instructions to a prompt
export const enhancePromptWithFormatting = (originalPrompt: string): string => {
  return `${originalPrompt}${getFormattingAndLanguageSection()}`;
};
