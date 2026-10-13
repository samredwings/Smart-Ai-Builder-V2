import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { RequirementItem } from '@/components';
import { useProject } from '@/hooks/useProject';

export default function RoadmapScreen() {
  const insets = useSafeAreaInsets();
  const { project, toggleRequirement, addRequirement, deleteRequirement, editRequirement } = useProject();
  const [newText, setNewText] = useState('');

  const requirements = project?.requirements ?? [];
  const total = requirements.length;
  const done = requirements.filter(r => r.status === 'done').length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    addRequirement(text);
    setNewText('');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Roadmap</Text>
          <Text style={styles.headerSub}>BRD Requirements Tracker</Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v{project?.version ?? 1}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Build Progress</Text>
            <Text style={styles.progressCount}>
              {done}<Text style={styles.progressTotal}>/{total}</Text>
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${pct}%` as any },
                pct === 100 && styles.progressBarComplete,
              ]}
            />
          </View>
          <View style={styles.progressFooter}>
            <Text style={styles.progressPct}>{pct}% complete</Text>
            <Text style={styles.progressStatus}>
              {pct === 100 ? '🎉 All done!' : pct >= 50 ? 'Halfway there' : 'In progress'}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Planned', count: requirements.filter(r => r.status === 'planned').length, color: Colors.primary },
              { label: 'Done', count: done, color: Colors.success },
              { label: 'Total', count: total, color: Colors.textSecondary },
            ].map(stat => (
              <View key={stat.label} style={styles.stat}>
                <Text style={[styles.statCount, { color: stat.color }]}>{stat.count}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Requirements List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Requirements (BRD)</Text>
            <Text style={styles.sectionSub}>Tap to check · Tap text to edit</Text>
          </View>

          {requirements.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="track-changes" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Requirements appear here after your first refine.</Text>
            </View>
          ) : (
            <View style={styles.requirementsList}>
              {requirements.map(req => (
                <RequirementItem
                  key={req.id}
                  requirement={req}
                  onToggle={toggleRequirement}
                  onDelete={deleteRequirement}
                  onEdit={editRequirement}
                />
              ))}
            </View>
          )}
        </View>

        {/* Add Requirement */}
        <View style={styles.addSection}>
          <Text style={styles.addLabel}>ADD MANUAL REQUIREMENT</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newText}
              onChangeText={setNewText}
              placeholder="Describe a new requirement..."
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Pressable
              onPress={handleAdd}
              disabled={!newText.trim()}
              style={({ pressed }) => [
                styles.addBtn,
                !newText.trim() && styles.addBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              <MaterialIcons name="add" size={20} color={newText.trim() ? '#000' : Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Source Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>SOURCE LEGEND</Text>
          <View style={styles.legendGrid}>
            {[
              { source: 'Original', color: Colors.sourceOriginal, desc: 'From initial description' },
              { source: 'Added', color: Colors.sourceAdded, desc: 'AI-extracted from chat' },
              { source: 'Changed', color: Colors.sourceChanged, desc: 'Scope modified' },
              { source: 'Manual', color: Colors.textMuted, desc: 'Added by you' },
            ].map(item => (
              <View key={item.source} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <View>
                  <Text style={styles.legendItemTitle}>{item.source}</Text>
                  <Text style={styles.legendItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: Typography.fontSizeLg,
    fontWeight: Typography.weightBold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  versionBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  versionText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.weightSemibold,
    color: Colors.accent,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    ...Shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.weightSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressCount: {
    fontSize: Typography.fontSizeXl,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
  },
  progressTotal: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.weightRegular,
    color: Colors.textMuted,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  progressBarComplete: {
    backgroundColor: Colors.success,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  progressPct: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  progressStatus: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    gap: Spacing.base,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statCount: {
    fontSize: Typography.fontSizeXl,
    fontWeight: Typography.weightBold,
  },
  statLabel: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeBase,
    fontWeight: Typography.weightSemibold,
    color: Colors.text,
  },
  sectionSub: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
  },
  requirementsList: {
    paddingHorizontal: Spacing.base,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  addSection: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    ...Shadows.card,
  },
  addLabel: {
    fontSize: Typography.fontSizeXs,
    fontWeight: Typography.weightSemibold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  addInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  legendTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: Typography.weightSemibold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  legendGrid: {
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  legendItemTitle: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.weightMedium,
    color: Colors.text,
  },
  legendItemDesc: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
