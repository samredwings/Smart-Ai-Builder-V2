// app/settings.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  loadApiKeys,
  saveApiKeys,
  initializeAIService,
  getAvailableProviders,
  getQuotaStatus,
  resetAllQuotas,
} from '@/services/ai';
import { QuotaStatus } from '@/services/ai/types';

interface ProviderConfig {
  id: string;
  name: string;
  color: string;
  keyPlaceholder: string;
  docsUrl: string;
  rateLimit: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    color: '#4285F4',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    rateLimit: '15 RPM / 1,500/day',
  },
  {
    id: 'groq',
    name: 'Groq',
    color: '#F55036',
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    rateLimit: '30 RPM / 1,000/day',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#10B981',
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    rateLimit: '20 RPM / 50/day (free)',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    color: '#FFD21E',
    keyPlaceholder: 'hf_...',
    docsUrl: 'https://huggingface.co/settings/tokens',
    rateLimit: '~$0.10 credits/month',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [available, setAvailable] = useState<string[]>([]);
  const [quota, setQuota] = useState<Record<string, QuotaStatus>>({});
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const stored = await loadApiKeys();
    setKeys({
      gemini: stored.gemini || '',
      groq: stored.groq || '',
      openrouter: stored.openrouter || '',
      huggingface: stored.huggingface || '',
    });
    setOllamaUrl(stored.ollamaUrl || '');

    try {
      await initializeAIService();
      setAvailable(getAvailableProviders());
      setQuota(getQuotaStatus());
    } catch (e) {
      // Not initialized yet
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveApiKeys({
        gemini: keys.gemini || undefined,
        groq: keys.groq || undefined,
        openrouter: keys.openrouter || undefined,
        huggingface: keys.huggingface || undefined,
        ollamaUrl: ollamaUrl || undefined,
      });

      await initializeAIService();
      setAvailable(getAvailableProviders());
      setQuota(getQuotaStatus());

      Alert.alert('Saved', 'API keys saved and providers refreshed.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save keys');
    } finally {
      setSaving(false);
    }
  };

  const handleResetQuota = () => {
    Alert.alert(
      'Reset Quotas',
      'Reset daily quotas for all providers?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetAllQuotas();
            setQuota(getQuotaStatus());
          },
        },
      ]
    );
  };

  const updateKey = (providerId: string, value: string) => {
    setKeys((prev) => ({ ...prev, [providerId]: value }));
  };

  const isProviderAvailable = (id: string) => available.includes(id);

  const getQuotaDisplay = (id: string) => {
    const q = quota[id];
    if (!q) return null;
    const percent = Math.round((q.requestsRemaining / q.requestsPerDay) * 100);
    return `${q.requestsRemaining}/${q.requestsPerDay} (${percent}%)`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Provider Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" />
          <Text style={styles.infoText}>
            Add at least one API key to enable AI code generation. The app will automatically
            fall back to the next available provider if one fails.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>API Keys</Text>
        {PROVIDERS.map((provider) => (
  
