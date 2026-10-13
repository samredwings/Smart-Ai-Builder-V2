import AsyncStorage from '@react-native-async-storage/async-storage';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Requirement {
  id: string;
  text: string;
  source: 'original' | 'added' | 'changed' | 'manual';
  status: 'planned' | 'done' | 'changed';
  versionFirstSeen: number | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  requirements: Requirement[];
  buildHistory: BuildRecord[];
}

export interface BuildRecord {
  id: string;
  status: 'success' | 'failed';
  createdAt: string;
  filename: string;
}

const PROJECT_KEY = '@appforge_project';

const DEFAULT_REQUIREMENTS: Requirement[] = [
  { id: 'r1', text: 'Landing screen with app description and CTA', source: 'original', status: 'planned', versionFirstSeen: 1 },
  { id: 'r2', text: 'AI chat interface to describe and refine app', source: 'original', status: 'planned', versionFirstSeen: 1 },
  { id: 'r3', text: 'Requirements roadmap with progress tracking', source: 'original', status: 'planned', versionFirstSeen: 1 },
  { id: 'r4', text: 'APK export with build pipeline visualization', source: 'original', status: 'planned', versionFirstSeen: 1 },
];

const DEFAULT_PROJECT: Project = {
  id: 'proj_001',
  name: 'My App',
  description: 'Describe your app to get started.',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
  requirements: DEFAULT_REQUIREMENTS,
  buildHistory: [],
};

export async function loadProject(): Promise<Project> {
  try {
    const raw = await AsyncStorage.getItem(PROJECT_KEY);
    if (raw) return JSON.parse(raw) as Project;
  } catch {}
  return { ...DEFAULT_PROJECT };
}

export async function saveProject(project: Project): Promise<void> {
  try {
    await AsyncStorage.setItem(PROJECT_KEY, JSON.stringify({
      ...project,
      updatedAt: new Date().toISOString(),
    }));
  } catch {}
}

export async function resetProject(): Promise<Project> {
  const fresh: Project = {
    ...DEFAULT_PROJECT,
    id: `proj_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    requirements: DEFAULT_REQUIREMENTS.map(r => ({ ...r })),
    buildHistory: [],
  };
  await saveProject(fresh);
  return fresh;
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
