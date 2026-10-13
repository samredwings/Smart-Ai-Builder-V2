import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface Props {
  label: string;
  status: StepStatus;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export const BuildStepRow = memo(function BuildStepRow({ label, status, icon }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, styles[`iconWrap_${status}`]]}>
        <MaterialIcons
          name={icon}
          size={16}
          color={
            status === 'done' ? Colors.success
            : status === 'running' ? Colors.primary
            : status === 'error' ? Colors.error
            : Colors.textMuted
          }
        />
      </View>
      <Text style={[styles.label, status === 'done' && styles.labelDone, status === 'pending' && styles.labelPending]}>
        {label}
      </Text>
      <View style={styles.statusWrap}>
        {status === 'running' && <ActivityIndicator size="small" color={Colors.primary} />}
        {status === 'done' && <MaterialIcons name="check-circle" size={18} color={Colors.success} />}
        {status === 'error' && <MaterialIcons name="error" size={18} color={Colors.error} />}
        {status === 'pending' && (
          <View style={styles.pendingDot} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
  },
  iconWrap_pending: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  iconWrap_running: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary + '50',
  },
  iconWrap_done: {
    backgroundColor: Colors.successDim,
    borderColor: Colors.success + '40',
  },
  iconWrap_error: {
    backgroundColor: Colors.errorDim,
    borderColor: Colors.error + '40',
  },
  label: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    fontWeight: Typography.weightMedium,
  },
  labelDone: {
    color: Colors.textSecondary,
  },
  labelPending: {
    color: Colors.textMuted,
  },
  statusWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
});
