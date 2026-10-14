// services/ai/validateKey.ts
// Quick client-side validation for API key formats before saving

export function validateGeminiKey(key: string): boolean {
  return /^AIzaSy[A-Za-z0-9_-]{30,}$/.test(key);
}

export function validateGroqKey(key: string): boolean {
  return /^gsk_[A-Za-z0-9_-]{30,}$/.test(key);
}

export function validateOpenRouterKey(key: string): boolean {
  return /^sk-or-v1-[A-Za-z0-9_-]{30,}$/.test(key);
}

export function validateHuggingFaceKey(key: string): boolean {
  return /^hf_[A-Za-z0-9_-]{30,}$/.test(key);
}

export function validateOllamaUrl(url: string): boolean {
  return /^https?:\/\/.+/.test(url);
}

export function validateKey(providerId: string, key: string): boolean {
  switch (providerId) {
    case 'gemini':
      return validateGeminiKey(key);
    case 'groq':
      return validateGroqKey(key);
    case 'openrouter':
      return validateOpenRouterKey(key);
    case 'huggingface':
      return validateHuggingFaceKey(key);
    default:
      return key.length > 10;
  }
}

export function getKeyErrorMessage(providerId: string): string {
  switch (providerId) {
    case 'gemini':
      return 'Gemini keys start with "AIzaSy" and are ~39 characters';
    case 'groq':
      return 'Groq keys start with "gsk_"';
    case 'openrouter':
      return 'OpenRouter keys start with "sk-or-v1-"';
    case 'huggingface':
      return 'Hugging Face tokens start with "hf_"';
    default:
      return 'Invalid key format';
  }
}
