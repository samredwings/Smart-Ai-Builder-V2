import { Requirement, generateId } from './projectService';

// Mock AI responses for app building suggestions
const AI_RESPONSES: Record<string, string> = {
  default: `Got it! I'm analyzing your request and updating the app structure.\n\n**Changes applied:**\n- Updated component architecture\n- Refined UI layout and spacing\n- Added state management for the new feature\n\nThe preview has been refreshed. Let me know if you'd like to tweak anything further!`,
  
  dashboard: `**Dashboard tab added!** 📊\n\nHere's what I built:\n- Summary cards with key metrics\n- Recent activity feed\n- Quick action buttons\n\nThe data is currently mocked — tell me what real data you want to track and I'll wire it up.`,
  
  theme: `**Theme updated!** 🎨\n\nApplied changes:\n- Color palette refreshed across all screens\n- Typography hierarchy improved\n- Card shadows and borders refined\n\nWant to tweak specific colors? Just describe what you're going for.`,
  
  storage: `**Persistence added!** 💾\n\nImplemented:\n- Local storage with AsyncStorage\n- Auto-save on every change\n- Data survives app restarts\n\nYour entries will now persist between sessions. Want me to add export/import functionality?`,
  
  tab: `**New tab created!** 🗂️\n\nSetup complete:\n- Tab added to bottom navigation\n- Placeholder content with your description\n- Smooth transition animations\n\nDescribe what content should go in this tab and I'll build it out.`,
  
  auth: `**Authentication flow ready!** 🔐\n\nBuilt:\n- Login screen with email/password\n- Sign up with validation\n- Persistent session management\n\nCurrently using mock auth — connect to your backend when ready to go live.`,

  list: `**List view implemented!** 📋\n\nAdded:\n- Scrollable item list with pull-to-refresh\n- Search and filter bar\n- Swipe-to-delete with confirmation\n- Empty state illustration\n\nWant to add categories or sorting options?`,
};

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('dashboard') || lower.includes('stats') || lower.includes('metric')) return 'dashboard';
  if (lower.includes('theme') || lower.includes('color') || lower.includes('dark') || lower.includes('style')) return 'theme';
  if (lower.includes('storage') || lower.includes('persist') || lower.includes('save') || lower.includes('remember')) return 'storage';
  if (lower.includes('tab') || lower.includes('screen') || lower.includes('page')) return 'tab';
  if (lower.includes('auth') || lower.includes('login') || lower.includes('sign')) return 'auth';
  if (lower.includes('list') || lower.includes('entries') || lower.includes('log') || lower.includes('catalog')) return 'list';
  return 'default';
}

function extractRequirements(message: string, currentVersion: number): Requirement[] {
  const newReqs: Requirement[] = [];
  const lower = message.toLowerCase();

  const featureMap: Array<{ keywords: string[]; text: string }> = [
    { keywords: ['dashboard', 'stats', 'metric'], text: 'Dashboard tab with key metrics and charts' },
    { keywords: ['dark theme', 'dark mode'], text: 'Dark mode theme with system preference detection' },
    { keywords: ['storage', 'persist', 'save'], text: 'Local data persistence with AsyncStorage' },
    { keywords: ['search', 'filter'], text: 'Search and filter functionality for lists' },
    { keywords: ['auth', 'login'], text: 'User authentication with session management' },
    { keywords: ['notification', 'alert'], text: 'Push notification support' },
    { keywords: ['camera', 'photo'], text: 'Camera and photo library access' },
    { keywords: ['map', 'location'], text: 'Map integration with location services' },
  ];

  for (const { keywords, text } of featureMap) {
    if (keywords.some(k => lower.includes(k))) {
      newReqs.push({
        id: generateId(),
        text,
        source: 'added',
        status: 'planned',
        versionFirstSeen: currentVersion,
      });
    }
  }

  return newReqs.slice(0, 2); // max 2 new requirements per message
}

export interface AiStreamChunk {
  text: string;
  done: boolean;
}

export async function streamAiResponse(
  message: string,
  onChunk: (chunk: AiStreamChunk) => void,
  currentVersion: number
): Promise<{ newRequirements: Requirement[] }> {
  const intent = detectIntent(message);
  const fullResponse = AI_RESPONSES[intent] || AI_RESPONSES.default;
  const words = fullResponse.split(' ');

  // Simulate streaming word by word
  for (let i = 0; i < words.length; i++) {
    await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
    const text = words.slice(0, i + 1).join(' ');
    onChunk({ text, done: i === words.length - 1 });
  }

  const newRequirements = extractRequirements(message, currentVersion);
  return { newRequirements };
}
