// app/preview.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { readProjectFiles } from '@/services/ai/codePipeline';

interface ProjectFile {
  path: string;
  content: string;
}

export default function PreviewScreen() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const projectId = params.projectId;

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    try {
      const all = await readProjectFiles(projectId);
      setFiles(all);
      if (all.length > 0) setSelected(all[0].path);
    } catch (e) {
      console.error('Preview load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedFile = files.find((f) => f.path === selected);

  if (!projectId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Ionicons name="eye-off-outline" size={40} color="#64748B" />
          <Text style={styles.emptyText}>No project selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Ionicons name="code-slash-outline" size={20} color="#60A5FA" />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {projectId}
        </Text>
        <Text style={styles.headerCount}>{files.length}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
      ) : files.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={40} color="#64748B" />
          <Text style={styles.emptyText}>No files in this project yet</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
            {files.map((f) => (
              <TouchableOpacity
                key={f.path}
                style={[styles.fileRow, selected === f.path && styles.fileRowActive]}
                onPress={() => setSelected(f.path)}
              >
                <Ionicons
                  name={f.path.endsWith('.ts') || f.path.endsWith('.tsx') ? 'code-slash' : 'document-outline'}
                  size={13}
                  color={selected === f.path ? '#F8FAFC' : '#64748B'}
                />
                <Text
                  style={[styles.fileName, selected === f.path && styles.fileNameActive]}
                  numberOfLines={1}
                >
                  {f.path}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.codePane} contentContainerStyle={styles.codeContent}>
            <Text style={styles.codeText}>{selectedFile?.content || 'Select a file'}</Text>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  headerCount: {
    fontSize: 11,
    color: '#94A3B8',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loader: { marginTop: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { color: '#64748B', fontSize: 14 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 150, borderRightWidth: 1, borderRightColor: '#1E293B' },
  sidebarContent: { padding: 8, gap: 4 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fileRowActive: { backgroundColor: '#1E293B' },
  fileName: { flex: 1, fontSize: 11, color: '#94A3B8' },
  fileNameActive: { color: '#F8FAFC', fontWeight: '600' },
  codePane: { flex: 1, backgroundColor: '#0B1120' },
  codeContent: { padding: 12 },
  codeText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#CBD5E1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
