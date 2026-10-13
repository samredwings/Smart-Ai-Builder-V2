import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { Requirement } from '@/services/projectService';

interface Props {
  requirement: Requirement;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

const SOURCE_CONFIG: Record<Requirement['source'], { label: string; color: string; bg: string }> = {
  original: { label: 'Original', color: Colors.sourceOriginal, bg: Colors.sourceOriginal + '20' },
  added: { label: 'Added', color: Colors.sourceAdded, bg: Colors.sourceAdded + '20' },
  changed: { label: 'Changed', color: Colors.sourceChanged, bg: Colors.sourceChanged + '20' },
  manual: { label: 'Manual', color: Colors.textMuted, bg: Colors.border },
};

export const RequirementItem = memo(function RequirementItem({ requirement, onToggle, onDelete, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(requirement.text);
  const isDone = requirement.status === 'done';
  const srcCfg = SOURCE_CONFIG[requirement.source];

  const handleEditDone = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== requirement.text) {
      onEdit(requirement.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onToggle(requirement.id)}
        style={[styles.checkbox, isDone && styles.checkboxDone]}
        hitSlop={8}
      >
        {isDone && <MaterialIcons name="check" size={12} color="#000" />}
      </Pressable>

      <View style={styles.content}>
        {editing ? (
          <TextInput
            value={editText}
            onChangeText={setEditText}
            onBlur={handleEditDone}
            onSubmitEditing={handleEditDone}
            autoFocus
            style={styles.editInput}
            returnKeyType="done"
          />
        ) : (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={[styles.text, isDone && styles.textDone]}>
              {requirement.text}
            </Text>
          </Pressable>
        )}

        <View style={styles.tags}>
          <View style={[styles.badge, { backgroundColor: srcCfg.bg }]}>
            <Text style={[styles.badgeText, { color: srcCfg.color }]}>{srcCfg.label}</Text>
          </View>
          {requirement.versionFirstSeen != null && (
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{requirement.versionFirstSeen}</Text>
            </View>
          )}
          {requirement.status === 'changed' && (
            <View style={[styles.badge, { backgroundColor: Colors.warningDim }]}>
              <Text style={[styles.badgeText, { color: Colors.warning }]}>scope changed</Text>
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={() => onDelete(requirement.id)}
        hitSlop={10}
        style={styles.deleteBtn}
      >
        <MaterialIcons name="close" size={14} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    lineHeight: 20,
  },
  textDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  editInput: {
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weightSemibold,
  },
  versionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentDim,
  },
  versionText: {
    fontSize: 10,
    fontWeight: Typography.weightSemibold,
    color: Colors.accent,
  },
  deleteBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
});
