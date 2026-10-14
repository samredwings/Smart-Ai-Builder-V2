import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Requirement {
  id: string;
  title: string;
  category: 'ui' | 'feature' | 'auth' | 'database' | 'integration';
  status: 'planned' | 'in_progress' | 'completed';
  source: 'user_prompt' | 'ai_extracted';
  versionAdded: string;
}

export interface ExtractedIntent {
  detectedCategory: Requirement['category'];
  suggestedTitle: string;
}

export const detectIntent = (message: string): ExtractedIntent | null => {
  const lower = message.toLowerCase();
  if (lower.includes('dash') || lower.includes('chart') || lower.includes('analytic')) {
    return { detectedCategory: 'ui', suggestedTitle: 'Dashboard & Analytics Module' };
  }
  if (lower.includes('dark') || lower.includes('theme') || lower.includes('style')) {
    return { detectedCategory: 'ui', suggestedTitle: 'Theme & Custom Styling Engine' };
  }
  if (lower.includes('auth') || lower.includes('login') || lower.includes('user')) {
    return { detectedCategory: 'auth', suggestedTitle: 'User Authentication & Session Management' };
  }
  if (lower.includes('sheet') || lower.includes('db') || lower.includes('database')) {
    return { detectedCategory: 'database', suggestedTitle: 'Google Sheets & Persistence Sync' };
  }
  if (lower.includes('git') || lower.includes('repo') || lower.includes('clone')) {
    return { detectedCategory: 'integration', suggestedTitle: 'In-App Git Repository Manager' };
  }
  return null;
};

export const extractRequirements = (message: string, currentVersion: string = 'v2.0'): Requirement[] => {
  const intent = detectIntent(message);
  if (!intent) return [];

  return [{
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: intent.suggestedTitle,
    category: intent.detectedCategory,
    status: 'planned',
    source: 'ai_extracted',
    versionAdded: currentVersion,
  }];
};

export async function* streamRealAiResponse(
  userPrompt: string,
  apiEndpoint: string,
  apiKey?: string
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`AI Gateway network exception: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.replace('data: ', '');
        if (jsonStr === '[DONE]') return;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
          // Continue processing stream buffer
        }
      }
    }
  }
}
