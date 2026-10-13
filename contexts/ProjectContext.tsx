import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Project,
  Message,
  Requirement,
  loadProject,
  saveProject,
  resetProject,
  generateId,
} from '@/services/projectService';
import { streamAiResponse } from '@/services/aiService';

interface ProjectContextType {
  project: Project | null;
  isLoading: boolean;
  isSending: boolean;
  streamingText: string;
  sendMessage: (text: string) => Promise<void>;
  toggleRequirement: (id: string) => void;
  addRequirement: (text: string) => void;
  deleteRequirement: (id: string) => void;
  editRequirement: (id: string, text: string) => void;
  resetApp: () => Promise<void>;
  buildHistory: Project['buildHistory'];
  addBuildRecord: (record: Project['buildHistory'][0]) => void;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  useEffect(() => {
    loadProject().then(p => {
      setProject(p);
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback((updated: Project) => {
    setProject(updated);
    saveProject(updated);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!project || isSending) return;
    setIsSending(true);
    setStreamingText('');

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const withUser: Project = {
      ...project,
      messages: [...project.messages, userMsg],
    };
    persist(withUser);

    let accumulated = '';
    const { newRequirements } = await streamAiResponse(
      text,
      ({ text: chunk }) => {
        accumulated = chunk;
        setStreamingText(accumulated);
      },
      project.version
    );

    const assistantMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: accumulated,
      createdAt: new Date().toISOString(),
    };

    const withAssistant: Project = {
      ...withUser,
      messages: [...withUser.messages, assistantMsg],
      requirements: [...withUser.requirements, ...newRequirements],
      version: withUser.version + (newRequirements.length > 0 ? 1 : 0),
    };

    persist(withAssistant);
    setStreamingText('');
    setIsSending(false);
  }, [project, isSending, persist]);

  const toggleRequirement = useCallback((id: string) => {
    if (!project) return;
    const updated: Project = {
      ...project,
      requirements: project.requirements.map(r =>
        r.id === id
          ? { ...r, status: r.status === 'done' ? 'planned' : 'done' }
          : r
      ),
    };
    persist(updated);
  }, [project, persist]);

  const addRequirement = useCallback((text: string) => {
    if (!project) return;
    const req: Requirement = {
      id: generateId(),
      text,
      source: 'manual',
      status: 'planned',
      versionFirstSeen: project.version,
    };
    const updated: Project = {
      ...project,
      requirements: [...project.requirements, req],
    };
    persist(updated);
  }, [project, persist]);

  const deleteRequirement = useCallback((id: string) => {
    if (!project) return;
    const updated: Project = {
      ...project,
      requirements: project.requirements.filter(r => r.id !== id),
    };
    persist(updated);
  }, [project, persist]);

  const editRequirement = useCallback((id: string, text: string) => {
    if (!project) return;
    const updated: Project = {
      ...project,
      requirements: project.requirements.map(r =>
        r.id === id ? { ...r, text } : r
      ),
    };
    persist(updated);
  }, [project, persist]);

  const addBuildRecord = useCallback((record: Project['buildHistory'][0]) => {
    if (!project) return;
    const updated: Project = {
      ...project,
      buildHistory: [record, ...project.buildHistory],
    };
    persist(updated);
  }, [project, persist]);

  const resetApp = useCallback(async () => {
    const fresh = await resetProject();
    setProject(fresh);
  }, []);

  return (
    <ProjectContext.Provider value={{
      project,
      isLoading,
      isSending,
      streamingText,
      sendMessage,
      toggleRequirement,
      addRequirement,
      deleteRequirement,
      editRequirement,
      resetApp,
      buildHistory: project?.buildHistory ?? [],
      addBuildRecord,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}
