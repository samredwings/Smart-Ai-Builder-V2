// hooks/useAIRequirements.ts
// Bridges chat messages to structured requirements for the build pipeline

import { useState, useCallback } from 'react';
import { getAiResponse } from '@/services/ai';

export type RequirementStatus = 'planned' | 'in_progress' | 'completed' | 'changed';

export interface Requirement {
  id: string;
  text: string;
  category: 'ui' | 'feature' | 'auth' | 'database' | 'integration' | 'other';
  status: RequirementStatus;
  source: 'ai_extracted' | 'manual';
  createdAt: number;
}

const REQUIREMENTS_STORAGE_KEY = '@ai_requirements';

export function useAIRequirements() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [extracting, setExtracting] = useState(false);

  // Extract requirements from a user chat message using AI
  const extractFromMessage = useCallback(async (message: string): Promise<Requirement[]> => {
    setExtracting(true);
    try {
      const result = await getAiResponse(
        `Analyze this app request and extract a JSON array of build requirements.
Each requirement should be a specific, actionable task.
Respond ONLY with a JSON array in this format:
[
  {"text": "string", "category": "ui|feature|auth|database|integration|other"}
]

User request: "${message}"`
      );

      const jsonMatch = result.text.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      const newReqs: Requirement[] = parsed.map((item: any, i: number) => ({
        id: `req_${Date.now()}_${i}`,
        text: item.text || 'Unknown requirement',
        category: ['ui', 'feature', 'auth', 'database', 'integration'].includes(item.category)
          ? item.category
          : 'other',
        status: 'planned',
        source: 'ai_extracted',
        createdAt: Date.now(),
      }));

      setRequirements((prev) => {
        // Merge: avoid duplicates by text similarity
        const existingTexts = prev.map((r) => r.text.toLowerCase());
        const filtered = newReqs.filter(
          (r) => !existingTexts.some((et) => r.text.toLowerCase().includes(et) || et.includes(r.text.toLowerCase()))
        );
        return [...prev, ...filtered];
      });

      return newReqs;
    } catch (e) {
      console.error('Failed to extract requirements:', e);
      return [];
    } finally {
      setExtracting(false);
    }
  }, []);

  const addManual = useCallback((text: string, category: Requirement['category'] = 'feature') => {
    const req: Requirement = {
      id: `req_${Date.now()}_manual`,
      text,
      category,
      status: 'planned',
      source: 'manual',
      createdAt: Date.now(),
    };
    setRequirements((prev) => [...prev, req]);
    return req;
  }, []);

  const updateStatus = useCallback((id: string, status: RequirementStatus) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  }, []);

  const removeRequirement = useCallback((id: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRequirements([]);
  }, []);

  const getCompletedCount = useCallback(() => {
    return requirements.filter((r) => r.status === 'completed').length;
  }, [requirements]);

  return {
    requirements,
    extracting,
    extractFromMessage,
    addManual,
    updateStatus,
    removeRequirement,
    clearAll,
    getCompletedCount,
    total: requirements.length,
    completed: requirements.filter((r) => r.status === 'completed').length,
  };
          }
