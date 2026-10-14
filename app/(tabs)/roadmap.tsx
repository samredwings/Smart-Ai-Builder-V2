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
              <Text style={styles.chatButtonText}>Go to Chat</Te
