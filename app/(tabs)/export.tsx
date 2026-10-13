import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { BuildStepRow, StepStatus } from '@/components/ui/BuildStepRow';
import { useProject } from '@/hooks/useProject';
import { generateId } from '@/services/projectService';
import { useAlert } from '@/template';

const BUILD_STEPS: Array<{
  id: string;
  label: string;
  icon: 'inventory-2' | 'layers' | 'sync' | 'file-download';
  duration: number;
}> = [
  { id: 'assets', label: 'Copy static assets', icon: 'inventory-2', duration: 900 },
  { id: 'bundle', label: 'Build web app bundle', icon: 'layers', duration: 2000 },
  { id: 'sync', label: 'Sync Capacitor config', icon: 'sync', duration: 1200 },
  { id: 'compile', label: 'Compile & sign APK', icon: 'file-download', duration: 2800 },
];

type StepStatuses = Record<string, StepStatus>;

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const { project, addBuildRecord } = useProject();
  const { showAlert } = useAlert();

  const [isBuilding, setIsBuilding] = useState(false);
  const [buildComplete, setBuildComplete] = useState(false);
  const [buildFailed, setBuildFailed] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<StepStatuses>(
    Object.fromEntries(BUILD_STEPS.map(s => [s.id, 'pending' as StepStatus]))
  );

  const progressAnim = useRef(new Animated.Value(0)).current;

  const startBuild = async () => {
    if (isBuilding) return;
    setIsBuilding(true);
    setBuildComplete(false);
    setBuildFailed(false);
    setStepStatuses(Object.fromEntries(BUILD_STEPS.map(s => [s.id, 'pending' as StepStatus])));
    progressAnim.setValue(0);

    try {
      for (let i = 0; i < BUILD_STEPS.length; i++) {
        const step = BUILD_STEPS[i];
        setStepStatuses(prev => ({ ...prev, [step.id]: 'running' }));

        Animated.timing(progressAnim, {
          toValue: (i + 1) / BUILD_STEPS.length,
          duration: step.duration,
          useNativeDriver: false,
        }).start();

        await new Promise(r => setTimeout(r, step.duration));
        setStepStatuses(prev => ({ ...prev, [step.id]: 'done' }));
      }

      setBuildComplete(true);
      const record = {
        id: generateId(),
        status: 'success' as const,
        createdAt: new Date().toISOString(),
        filename: `app-forge-${project?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'app'}-v${project?.version ?? 1}.apk.zip`,
      };
      addBuildRecord(record);

      showAlert('Build Complete', `APK bundle ready!\n\nFilename: ${record.filename}\n\nIn a real build, this would download your signed APK bundle.`, [
        { text: 'OK', style: 'default' }
      ]);
    } catch {
      setBuildFailed(true);
      setStepStatuses(prev => {
        const updated = { ...prev };
        for (const s of BUILD_STEPS) {
          if (updated[s.id] !== 'done') {
            updated[s.id] = 'error';
            break;
          }
        }
        return updated;
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const resetBuild = () => {
    setBuildComplete(false);
    setBuildFailed(false);
    setStepStatuses(Object.fromEntries(BUILD_STEPS.map(s => [s.id, 'pending' as StepStatus])));
    progressAnim.setValue(0);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const buildHistory = project?.buildHistory ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Export</Text>
          <Text style={styles.headerSub}>APK Distribution Builder</Text>
        </View>
        <View style={[
          styles.headerBadge,
          buildComplete && styles.headerBadgeSuccess,
          buildFailed && styles.headerBadgeError,
          isBuilding && styles.headerBadgeActive,
        ]}>
          <View style={[
            styles.headerDot,
            buildComplete && { backgroundColor: Colors.success },
            buildFailed && { backgroundColor: Colors.error },
            isBuilding && { backgroundColor: Colors.primary },
          ]} />
          <Text style={[
            styles.headerBadgeText,
            buildComplete && { color: Colors.success },
            buildFailed && { color: Colors.error },
            isBuilding && { color: Colors.primary },
          ]}>
            {buildComplete ? 'Ready' : buildFailed ? 'Failed' : isBuilding ? 'Building' : 'Idle'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Build Card */}
        <View style={styles.buildCard}>
          <View style={styles.buildCardHeader}>
            <View style={styles.buildIconWrap}>
              <MaterialIcons name="android" size={28} color={Colors.success} />
            </View>
            <View style={styles.buildInfo}>
              <Text style={styles.buildTitle}>Android APK Bundle</Text>
              <Text style={styles.buildDesc}>
                Capacitor-powered signed APK with offline support
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.buildProgressBg}>
            <Animated.View
              style={[
                styles.buildProgressFill,
                { width: progressWidth as any },
                buildComplete && styles.buildProgressComplete,
                buildFailed && styles.buildProgressFailed,
              ]}
            />
          </View>

          {/* Steps */}
          <View style={styles.stepsContainer}>
            {BUILD_STEPS.map(step => (
              <BuildStepRow
                key={step.id}
                label={step.label}
                status={stepStatuses[step.id]}
                icon={step.icon}
              />
            ))}
          </View>

          {/* Action Button */}
          <Pressable
            onPress={buildComplete || buildFailed ? resetBuild : startBuild}
            disabled={isBuilding}
            style={({ pressed }) => [
              styles.buildBtn,
              buildComplete && styles.buildBtnSuccess,
              buildFailed && styles.buildBtnError,
              isBuilding && styles.buildBtnActive,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <MaterialIcons
              name={
                buildComplete ? 'refresh' :
                buildFailed ? 'replay' :
                isBuilding ? 'hourglass-bottom' :
                'file-download'
              }
              size={20}
              color={buildComplete ? Colors.success : isBuilding ? Colors.textMuted : '#000'}
            />
            <Text style={[
              styles.buildBtnText,
              buildComplete && { color: Colors.success },
              buildFailed && { color: Colors.error },
              isBuilding && { color: Colors.textMuted },
            ]}>
              {buildComplete ? 'Build Again' :
               buildFailed ? 'Retry Build' :
               isBuilding ? 'Building APK...' :
               'Generate APK Bundle'}
            </Text>
          </Pressable>

          {buildComplete && (
            <View style={styles.successNote}>
              <MaterialIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.successNoteText}>
                Build complete. In production, your signed APK bundle would download here.
                Open the Android folder in Android Studio to build from source.
              </Text>
            </View>
          )}
        </View>

        {/* App Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>BUILD CONFIGURATION</Text>
          <View style={styles.infoRows}>
            {[
              { label: 'App Name', value: project?.name ?? 'My App' },
              { label: 'Version', value: `v${project?.version ?? 1}.0.0` },
              { label: 'Build Target', value: 'Android API 33+' },
              { label: 'Architecture', value: 'arm64-v8a, x86_64' },
              { label: 'Runtime', value: 'Capacitor 6.x' },
              { label: 'Signing', value: 'Debug keystore (mocked)' },
            ].map(item => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* PWA Option */}
        <View style={styles.pwaCard}>
          <View style={styles.pwaHeader}>
            <MaterialIcons name="public" size={20} color={Colors.accent} />
            <Text style={styles.pwaTitle}>PWA Builder Engine</Text>
          </View>
          <Text style={styles.pwaDesc}>
            Convert your live web app into a Google Play Store bundle using Microsoft PWA Builder.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.pwaBtn, pressed && { opacity: 0.7 }]}
            onPress={() => showAlert('PWA Builder', 'This would open PWA Builder (pwabuilder.com) with your published app URL to generate a Play Store bundle.', [{ text: 'OK' }])}
          >
            <Text style={styles.pwaBtnText}>Open PWA Builder ↗</Text>
            <MaterialIcons name="open-in-new" size={14} color={Colors.accent} />
          </Pressable>
        </View>

        {/* Build History */}
        {buildHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>BUILD HISTORY</Text>
            {buildHistory.slice(0, 5).map(record => (
              <View key={record.id} style={styles.historyRow}>
                <MaterialIcons
                  name={record.status === 'success' ? 'check-circle' : 'error'}
                  size={16}
                  color={record.status === 'success' ? Colors.success : Colors.error}
                />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyFilename} numberOfLines={1}>{record.filename}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(record.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerBadgeSuccess: { borderColor: Colors.success + '50', backgroundColor: Colors.successDim },
  headerBadgeError: { borderColor: Colors.error + '50', backgroundColor: Colors.errorDim },
  headerBadgeActive: { borderColor: Colors.primary + '50', backgroundColor: Colors.primaryDim },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  headerBadgeText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: Typography.weightMedium,
    color: Colors.textMuted,
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  buildCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    ...Shadows.card,
  },
  buildCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  buildIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.successDim,
    borderWidth: 1,
    borderColor: Colors.success + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildInfo: {
    flex: 1,
  },
  buildTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.weightBold,
    color: Colors.text,
  },
  buildDesc: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  buildProgressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  buildProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  buildProgressComplete: {
    backgroundColor: Colors.success,
  },
  buildProgressFailed: {
    backgroundColor: Colors.error,
  },
  stepsContainer: {
    marginBottom: Spacing.base,
    gap: 2,
  },
  buildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    ...Shadows.glow,
  },
  buildBtnSuccess: {
    backgroundColor: Colors.successDim,
    borderWidth: 1,
    borderColor: Colors.success + '50',
    shadowOpacity: 0,
  },
  buildBtnError: {
    backgroundColor: Colors.errorDim,
    borderWidth: 1,
    borderColor: Colors.error + '50',
    shadowOpacity: 0,
  },
  buildBtnActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowOpacity: 0,
  },
  buildBtnText: {
    fontSize: Typography.fontSizeBase,
    fontWeight: Typography.weightSemibold,
    color: '#000',
  },
  successNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.successDim,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  successNoteText: {
    flex: 1,
    fontSize: Typography.fontSizeXs,
    color: Colors.success,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  infoTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: Typography.weightSemibold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  infoRows: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  infoLabel: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    fontWeight: Typography.weightMedium,
  },
  pwaCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
    padding: Spacing.base,
  },
  pwaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pwaTitle: {
    fontSize: Typography.fontSizeBase,
    fontWeight: Typography.weightSemibold,
    color: Colors.accent,
  },
  pwaDesc: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  pwaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  pwaBtnText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.weightSemibold,
    color: Colors.accent,
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  historyTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: Typography.weightSemibold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  historyInfo: {
    flex: 1,
  },
  historyFilename: {
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    fontWeight: Typography.weightMedium,
  },
  historyDate: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
