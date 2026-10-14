// Replace the bottom of orchestrator.ts:

// Singleton instance (initialized with keys from storage)
let orchestratorInstance: AIOrchestrator | null = null;

export function initOrchestrator(config: OrchestratorConfig): AIOrchestrator {
  orchestratorInstance = new AIOrchestrator(config);
  return orchestratorInstance;
}

export function getOrchestrator(): AIOrchestrator {
  if (!orchestratorInstance) {
    throw new Error('Orchestrator not initialized. Call initOrchestrator first.');
  }
  return orchestratorInstance;
}
