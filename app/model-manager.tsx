// app/model-manager.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  OFFLINE_MODELS,
  getModelManager,
  OfflineModel,
} from '@/services/ai/modelManager';

interface ModelRowState {
  downloaded: boolean;
  progress: number; // -1 = idle
  downloading: boolean;
}

export default function ModelManagerScreen() {
  const [states, setStates] = useState<Record<string, ModelRowState>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const manager = getModelManager();
    const next: Record<string, ModelRowState> = {};
    for (const m of OFFLINE_MODELS) {
      next[m.id] = {
        downloaded: await manager.isModelDownloaded(m.id),
        progress: -1,
        downloading: false,
      };
    }
    setStates(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDownload = async (model: OfflineModel) => {
    const manager = getModelManager();
    setStates((prev) => ({
      ...prev,
      [model.id]: { downloaded: false, progress: 0, downloading: true },
    }));

    try {
      await manager.downloadModel(model.id, (p) => {
        setStates((prev) => ({
          ...prev,
          [model.id]: { downloaded: false, progress: p.progress, downloading: true },
        }));
      });
      Alert.alert('Done', `${model.name} downloaded and ready for offline use.`);
      await refresh();
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Network error');
      await refresh();
    }
  };

  const handleDelete = (model: OfflineModel) => {
    Alert.alert('Delete model', `Remove ${model.name} from device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await getModelManager().deleteModel(model.id);
          await refresh();
        },
      },
    ]);
  };

  const renderRow = ({ item }: { item: OfflineModel }) => {
    const st = states[item.id] || { downloaded: false, progress: -1, downloading: false };
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={st.downloaded ? 'cloud-done-outline' : 'cloud-download-outline'}
            size={20}
            color={st.downloaded ? '#10B981' : '#60A5FA'}
          />
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSize}>~{item.sizeMB} MB · {item.id}</Text>
          </View>
          {st.downloaded ? (
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={18} color="#F87171" />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.cardDesc}>{item.description}</Text>

        {st.downloading ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${Math.round(st.progress * 100)}%` }]} />
          </View>
        ) : null}

        {!st.downloaded ? (
          <TouchableOpacity
            style={[styles.downloadButton, st.downloading && styles.downloadButtonDisabled]}
            onPress={() => handleDownload(item)}
            disabled={st.downloading}
          >
            {st.downloading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.downloadText}>
                  {Math.round(st.progress * 100)}%
                </Text>
              </>
            ) : (
              <Text style={styles.downloadText}>Download</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.readyBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.readyText}>Ready for offline use</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offline Models</Text>
        <Text style={styles.headerSubtitle}>
          GGUF models for on-device inference via llama.rn
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
      ) : (
        <FlatList
          data={OFFLINE_MODELS}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  cardSize: { fontSize: 11, color: '#64748B', marginTop: 2 },
  cardDesc: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
    overflow: 'hidden',
  },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#6366F1' },
  downloadButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  downloadButtonDisabled: { opacity: 0.7 },
  downloadText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  readyText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
});
