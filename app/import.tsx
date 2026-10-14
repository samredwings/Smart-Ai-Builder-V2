// app/import.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { pickAndExtractZipArchive } from '@/services/zipService';

export default function ImportScreen() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleImport = async () => {
    setImporting(true);
    setProgress('Picking file...');
    try {
      const result = await pickAndExtractZipArchive();
      if (!result) {
        setImporting(false);
        setProgress('');
        return;
      }

      setProgress(`Extracted ${result.files.length} files`);
      Alert.alert(
        'Import Complete',
        `Loaded ${result.files.length} files into project "${result.projectId}"`,
        [
          {
            text: 'Preview Now',
            onPress: () =>
              router.replace({
                pathname: '/preview',
                params: { projectId: result.projectId },
              }),
          },
          {
            text: 'OK',
            style: 'cancel',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e?.message || 'Could not extract ZIP');
    } finally {
      setImporting(false);
      setProgress('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Ionicons name="archive-outline" size={56} color="#6366F1" />
        <Text style={styles.title}>Import Pre-Built App</Text>
        <Text style={styles.subtitle}>
          Select a .zip file containing your React Native / Expo project files. They will be extracted and ready for preview.
        </Text>

        <TouchableOpacity
          style={[styles.button, importing && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Choose ZIP File</Text>
            </>
          )}
        </TouchableOpacity>

        {progress ? <Text style={styles.progress}>{progress}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  progress: {
    marginTop: 8,
    fontSize: 13,
    color: '#9CA3AF',
  },
});
