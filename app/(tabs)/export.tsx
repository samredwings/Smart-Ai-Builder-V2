// app/(tabs)/export.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProject } from '@/hooks/useProject';
import {
  runCodeGenerationPipeline,
  readProjectFiles,
  clearProjectFiles,
  PipelineResult,
  GeneratedFile,
} from '@/services/ai/codePipeline';
import { createZipFromFiles } from '@/services/zipService';

type ExportStep = 'idle' | 'generating' | 'writing' | 'zipping' | 'done' | 'error';

export default function ExportScreen() {
  const router = useRouter();
  const { project } = useProject();
  const [step, setStep] = useState<ExportStep>('idle');
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [zipUri, setZipUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<GeneratedFile[]>([]);

  const startBuild = async () => {
    if (!project) {
      Alert.alert('No Project', 'Create or select a project first.');
      return;
    }

    setStep('generating');
    setProgressText('Starting AI code generation...');
    setResult(null);
    setZipUri(null);
    setError(null);
    setFileTree([]);

    try {
      await clearProjectFiles(project.id);

      const pipelineResult = await runCodeGenerationPipeline(
        project.name || 'Build a simple React Native app',
        project,
        undefined,
        (stepMsg) => {
          setProgressText(stepMsg);
          if (stepMsg.includes('Writing')) setStep('writing');
        }
      );

      setResult(pipelineResult);
      setFileTree(pipelineResult.files);
      setStep('zipping');
      setProgressText('Creating ZIP archive...');

      const filesForZip = await readProjectFiles(project.id);
      const zipPath = await createZipFromFiles(filesForZip, `${project.id}.zip`);
      setZipUri(zipPath);

      setStep('done');
      setProgressText('Build complete!');
    } catch (err: any) {
      setStep('error');
      setError(err?.message || 'Build failed');
      console.error('Export error:', err);
    }
  };

  const handleShare = async () => {
    if (!zipUri) return;
    try {
      await Share.share({
        url: zipUri,
        message: `Project: ${project?.name || 'Untitled'}`,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share ZIP file');
    }
  };

  const handleClear = async () => {
    if (!project) return;
    Alert.alert('Clear Files', 'Delete all generated files for this project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearProjectFiles(project.id);
          setResult(null);
          setZipUri(null);
          setFileTree([]);
          setStep('idle');
        },
      },
    ]);
  };

  const getStepIcon = (): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (step) {
      case 'idle': return 'cube-outline';
      case 'generating': return 'hardware-chip-outline';
      case 'writing': return 'document-text-outline';
      case 'zipping': return 'archive-outline';
      case 'done': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      default: return 'cube-outline';
    }
  };

  const getStepColor = () => {
    switch (step) {
      case 'done': return '#10B981';
      case 'error': return '#EF4444';
      default: return '#6366F1';
    }
  };

  const isBuilding = step === 'generating' || step === 'writing' || step === 'zipping';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Export & Build</Text>
          {project && <Text style={styles.projectName}>{project.name}</Text>}
        </View>
        <TouchableOpacity
          style={styles.importIconButton}
          onPress={() => router.push('/import')}
        >
          <Ionicons name="download-outline" size={22} color="#E2E8F0" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, { borderColor: getStepColor() + '40' }]}>
          <View style={[styles.statusIconContainer, { backgroundColor: getStepColor() + '20' }]}>
            {isBuilding ? (
              <ActivityIndicator size="large" color={getStepColor()} />
            ) : (
              <Ionicons name={getStepIcon()} size={32} color={getStepColor()} />
            )}
          </View>
          <Text style={[styles.statusTitle, { color: getStepColor() }]}>
            {step === 'idle' && 'Ready to Build'}
            {step === 'generating' && 'Generating Code'}
            {step === 'writing' && 'Writing Files'}
            {step === 'zipping' && 'Creating ZIP'}
            {step === 'done' && 'Build Complete'}
            {step === 'error' && 'Build Failed'}
          </Text>
          <Text style={styles.statusSubtitle}>{progressText}</Text>

          {result ? (
            <View style={styles.metaContainer}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Provider</Text>
                <Text style={styles.metaValue}>{result.provider}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Model</Text>
                <Text style={styles.metaValue}>{result.model}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Files</Text>
                <Text style={styles.metaValue}>{result.files.length}</Text>
              </View>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {isBuilding ? (
          <View style={styles.buildButtonLoading}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.buildButtonText}>Building...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.buildButton, !project && styles.buildButtonDisabled]}
            onPress={startBuild}
            disabled={!project}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.buildButtonText}>
              {step === 'done' ? 'Rebuild Project' : 'Start Build'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.importButton}
          onPress={() => router.push('/import')}
        >
          <Ionicons name="archive-outline" size={16} color="#E2E8F0" />
          <Text style={styles.importButtonText}>Import Pre-Built ZIP</Text>
        </TouchableOpacity>

        {fileTree.length > 0 ? (
          <View style={styles.filesCard}>
            <View style={styles.filesHeader}>
              <Ionicons name="folder-open-outline" size={18} color="#94A3B8" />
              <Text style={styles.filesTitle}>Generated Files</Text>
              <Text style={styles.filesCount}>{fileTree.length}</Text>
            </View>
            {fileTree.map((file, i) => (
              <View key={i} style={styles.fileRow}>
                <Ionicons
                  name={file.path.endsWith('.tsx') || file.path.endsWith('.ts') ? 'code-slash' : 'document-outline'}
                  size={14}
                  color="#60A5FA"
                />
                <Text style={styles.filePath}>{file.path}</Text>
                <Text style={styles.fileSize}>{file.content.length} chars</Text>
              </View>
            ))}
          </View>
        ) : null}

        {zipUri ? (
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionText}>Share ZIP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push({
                pathname: '/preview',
                params: { projectId: project?.id }
              })}
            >
              <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionText}>Preview Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleClear}>
              <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
              <Text style={[styles.actionText, styles.secondaryText]}>Clear Files</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={18} color="#60A5FA" />
          <Text style={styles.infoText}>
            The AI will generate code files, write them to storage, and package them into a ZIP.
            You can then share the ZIP, extract it, and run with `npx expo start`.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  projectName: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  importIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  metaContainer: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metaValue: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  buildButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  buildButtonDisabled: {
    backgroundColor: '#374151',
  },
  buildButtonLoading: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  buildButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  importButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  filesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filesTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  filesCount: {
    fontSize: 12,
    color: '#94A3B8',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 8,
  },
  filePath: {
    flex: 1,
    fontSize: 13,
    color: '#CBD5E1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fileSize: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionsCard: {
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#475569',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryText: {
    color: '#FCA5A5',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#BFDBFE',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});
