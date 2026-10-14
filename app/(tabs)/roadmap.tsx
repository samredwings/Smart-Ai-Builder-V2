// app/(tabs)/roadmap.tsx
// AI-powered roadmap: extracted requirements from chat, build status, progress tracking

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAIRequirements, Requirement, RequirementStatus } from '@/hooks/useAIRequirements';

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  ui: 'color-palette-outline',
  feature: 'cube-outline',
  auth: 'lock-closed-outline',
  database: 'server-outline',
  integration: 'git-merge-outline',
  other: 'ellipse-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  ui: '#F472B6',
  feature: '#60A5FA',
  auth: '#FBBF24',
  database: '#A78BFA',
  integration: '#34D399',
  other: '#9CA3AF',
};

const STATUS_COLORS: Record<RequirementStatus, string> = {
  planned: '#6B7280',
  in_progress: '#F59E0B',
  completed: '#10B981',
  changed: '#EF4444',
};

const STATUS_LABELS: Record<RequirementStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Done',
  changed: 'Changed',
};

export default function RoadmapScreen() {
  const router = useRouter();
  const {
    requirements,
    extracting,
    addManual,
    updateStatus,
    removeRequirement,
    clearAll,
    completed,
    total,
  } = useAIRequirements();

  const [manualText, setManualText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddManual = () => {
    if (!manualText.trim()) return;
    addManual(manualText.trim());
    setManualText('');
    setShowAddForm(false);
  };

  const handleClear = () => {
    Alert.alert('Clear Roadmap', 'Remove all requirements?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAll },
    ]);
  };

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const renderRequirement = (req: Requirement) => (
    <View key={req.id} style={styles.reqCard}>
      <View style={styles.reqHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[req.category] + '20' }]}>
          <Ionicons
            name={CATEGORY_ICONS[req.category] || 'ellipse-outline'}
            size={16}
            color={CATEGORY_COLORS[req.category]}
          />
        </View>
        <Text style={styles.reqText}>{req.text}</Text>
        <TouchableOpacity onPress={() => removeRequirement(req.id)} style={styles.deleteBtn}>
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.reqFooter}>
        <View style={styles.statusRow}>
          {(['planned', 'in_progress', 'completed', 'changed'] as RequirementStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusChip,
                req.status === status && { backgroundColor: STATUS_COLORS[status] + '25', borderColor: STATUS_COLORS[status] },
              ]}
              onPress={() => updateStatus(req.id, status)}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: STATUS_COLORS[status] },
                  req.status !== status && { opacity: 0.3 },
                ]}
              />
              <Text
                style={[
                  styles.statusChipText,
                  req.status === status && { color: STATUS_COLORS[status], fontWeight: '600' },
                ]}
              >
                {STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sourceText}>{req.source === 'ai_extracted' ? 'AI' : 'Manual'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Roadmap</Text>
          <Text style={styles.headerSubtitle}>
            {completed}/{total} completed · {total > 0 ? Math.round((completed / total) * 100) : 0}%
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowAddForm((s) => !s)}>
            <Ionicons name="add" size={22} color="#E5E7EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleClear}>
            <Ionicons name="trash-outline" size={20} color="#FCA5A5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Extracting indicator */}
        {extracting && (
          <View style={styles.extractingCard}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.extractingText}>AI is analyzing your request...</Text>
          </View>
        )}

        {/* Add manual form */}
        {showAddForm && (
          <View style={styles.addForm}>
            <TextInput
              style={styles.addInput}
              value={manualText}
              onChangeText={setManualText}
              placeholder="Add a requirement..."
              placeholderTextColor="#6B7280"
              multiline
              maxLength={200}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddManual}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Requirements list */}
        {requirements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>No Requirements Yet</Text>
            <Text style={styles.emptySubtitle}>
              Chat with the AI to describe your app. Requirements will be extracted automatically.
              Or add them manually with the + button.
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.chatButtonText}>Go to Chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {requirements.map(renderRequirement)}

            {/* Build CTA */}
            <TouchableOpacity
              style={styles.buildCta}
              onPress={() => router.push('/(tabs)/export')}
            >
              <Ionicons name="hammer-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buildCtaText}>
                {completed === total && total > 0 ? 'Build App' : 'Build with Current Requirements'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

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
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  extractingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  extractingText: {
    fontSize: 13,
    color: '#BFDBFE',
  },
  addForm: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#475569',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  chatButton: {
    marginTop: 20,
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    gap: 10,
  },
  reqCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  reqText: {
    flex: 1,
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  deleteBtn: {
    padding: 2,
  },
  reqFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  sourceText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'right',
  },
  buildCta: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  buildCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
