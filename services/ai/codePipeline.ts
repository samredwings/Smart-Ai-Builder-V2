// services/ai/codePipeline.ts
// Turns AI responses into actual project files using Expo FileSystem
// Parses markdown code blocks and writes them to the project's directory

import * as FileSystem from 'expo-file-system';
import { generateCode, CodeGenRequest } from './aiService';
import { Project } from '@/services/projectService';

export interface GeneratedFile {
  path: string;      // e.g. "app/index.tsx"
  content: string;   // file contents
  language: string;  // typescript, javascript, etc.
}

export interface PipelineResult {
  files: GeneratedFile[];
  explanation: string;
  provider: string;
  model: string;
  projectPath: string;
}

// Regex to detect file paths in code block headers or comments
// Matches: "// File: app/index.tsx" or "File: components/Button.tsx"
const FILE_PATH_REGEX = /(?:\/\/|#|\*|{1,2})\s*File:\s*([^\n]+)/gi;

// Regex to detect file paths in opening code fence info
// ```tsx file="app/index.tsx"
const FENCE_FILE_REGEX = /```\w+\s+file=["']?([^"'\n]+)["']?/gi;

/**
 * Parse an AI response and extract individual files
 */
export function parseGeneratedFiles(aiResponse: string): {
  files: GeneratedFile[];
  explanation: string;
} {
  const files: GeneratedFile[] = [];
  let explanation = aiResponse;

  // Find all code blocks
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
    const language = match[1] || 'typescript';
    const blockContent = match[2].trim();
    const fullBlock = match[0];

    // Try to find file path in the block itself
    FILE_PATH_REGEX.lastIndex = 0;
    FENCE_FILE_REGEX.lastIndex = 0;

    let filePath: string | null = null;

    // Check for "// File: path" comment inside the block
    const pathMatch = FILE_PATH_REGEX.exec(blockContent);
    if (pathMatch) {
      filePath = pathMatch[1].trim();
    }

    // Check for file="path" in the fence
    const fenceMatch = FENCE_FILE_REGEX.exec(fullBlock);
    if (!filePath && fenceMatch) {
      filePath = fenceMatch[1].trim();
    }

    // If no explicit path, try to infer from content structure
    if (!filePath) {
      filePath = inferFilePath(blockContent, language, files.length);
    }

    // Clean the content: remove "// File:" comments from actual code
    const cleanContent = blockContent.replace(FILE_PATH_REGEX, '').trim();

    files.push({
      path: filePath,
      content: cleanContent,
      language,
    });

    // Remove this code block from explanation text
    explanation = explanation.replace(fullBlock, '');
  }

  // Clean up explanation
  explanation = explanation
    .replace(/File:\s*[^\n]+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { files, explanation };
}

/**
 * Infer a file path based on content and language when AI doesn't label it
 */
function inferFilePath(content: string, language: string, index: number): string {
  // Check for React component patterns
  if (content.includes('export default function') || content.includes('export default class')) {
    // Try to extract component name
    const nameMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    const name = nameMatch ? nameMatch[1] : `Screen${index}`;
    return `app/${name.toLowerCase()}.tsx`;
  }

  if (content.includes('import React') || content.includes('from "react"')) {
    return `components/Component${index}.tsx`;
  }

  if (language === 'css' || content.includes('StyleSheet.create')) {
    return `styles/styles${index}.ts`;
  }

  if (content.includes('export const') || content.includes('export function')) {
    return `utils/helpers${index}.ts`;
  }

  return `generated/file${index}.${language === 'javascript' ? 'js' : 'tsx'}`;
}

/**
 * Write generated files to the project's directory in FileSystem
 */
export async function writeFilesToProject(
  files: GeneratedFile[],
  project: Project
): Promise<string> {
  const projectDir = `${FileSystem.documentDirectory}projects/${project.id}/`;

  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(projectDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(projectDir, { intermediates: true });
  }

  for (const file of files) {
    // Sanitize path: no leading slash, no parent directory traversal
    const safePath = file.path.replace(/^\/+/, '').replace(/\.\.\//g, '');
    const fullPath = `${projectDir}${safePath}`;

    // Create subdirectories if needed
    const lastSlash = safePath.lastIndexOf('/');
    if (lastSlash > 0) {
      const subDir = `${projectDir}${safePath.substring(0, lastSlash)}`;
      const subInfo = await FileSystem.getInfoAsync(subDir);
      if (!subInfo.exists) {
        await FileSystem.makeDirectoryAsync(subDir, { intermediates: true });
      }
    }

    await FileSystem.writeAsStringAsync(fullPath, file.content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  return projectDir;
}

/**
 * Read all files in a project directory (for ZIP export)
 */
export async function readProjectFiles(projectId: string): Promise<
  { path: string; content: string }[]
> {
  const projectDir = `${FileSystem.documentDirectory}projects/${projectId}/`;
  const files: { path: string; content: string }[] = [];

  async function readDir(dir: string, prefix: string = '') {
    const items = await FileSystem.readDirectoryAsync(dir);

    for (const item of items) {
      const itemPath = `${dir}${item}`;
      const info = await FileSystem.getInfoAsync(itemPath);

      if (info.isDirectory) {
        await readDir(`${itemPath}/`, `${prefix}${item}/`);
      } else {
        const content = await FileSystem.readAsStringAsync(itemPath, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        files.push({
          path: `${prefix}${item}`,
          content,
        });
      }
    }
  }

  const dirInfo = await FileSystem.getInfoAsync(projectDir);
  if (dirInfo.exists) {
    await readDir(projectDir);
  }

  return files;
}

/**
 * Main pipeline: generate code from prompt and write to project
 */
export async function runCodeGenerationPipeline(
  prompt: string,
  project: Project,
  context?: string,
  onProgress?: (step: string) => void
): Promise<PipelineResult> {
  onProgress?.('Generating code with AI...');

  const request: CodeGenRequest = {
    prompt: `Generate a complete React Native Expo app for: ${prompt}`,
    context,
    model: undefined,
    systemPrompt: undefined,
  };

  const result = await generateCode(request, (code, providerId) => {
    onProgress?.(`Generating... (${providerId})`);
  });

  onProgress?.('Parsing generated files...');
  const { files, explanation } = parseGeneratedFiles(result.code);

  if (files.length === 0) {
    throw new Error('No code files were generated. The AI response may not contain valid code blocks.');
  }

  onProgress?.(`Writing ${files.length} files to project...`);
  const projectPath = await writeFilesToProject(files, project);

  return {
    files,
    explanation,
    provider: result.provider,
    model: result.model,
    projectPath,
  };
}

/**
 * Delete a project's generated files
 */
export async function clearProjectFiles(projectId: string): Promise<void> {
  const projectDir = `${FileSystem.documentDirectory}projects/${projectId}/`;
  const info = await FileSystem.getInfoAsync(projectDir);
  if (info.exists) {
    await FileSystem.deleteAsync(projectDir, { idempotent: true });
  }
}
