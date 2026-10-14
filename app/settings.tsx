// app/settings.tsx
// AI Provider settings — add API keys, check quota, configure Ollama

import React, { useState, useEffect, useCallback } from 'react';
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
  keyPrefix: string;
  keyPlaceholder: string;
  docsUrl: string;
  rateLimit: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    color: '#4285F4',
    keyPrefix: '...',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    rateLimit: '15 RPM / 1,500/day',
  },
  {
    id: 'groq',
    name: 'Groq',
    color: '#F55036',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    rateLimit: '30 RPM / 1,000/day',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#10B981',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    rateLimit: '20 RPM / 50/day (free)',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    color: '#FFD21E',
    keyPrefix: 'hf_',
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
      // Not initialized yet — that's fine
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
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#60A5FA" />
          <Text style={styles.infoText}>
            Add at least one API key to enable AI code generation. The app will automatically
            fall back to the next available provider if one fails.
          </Text>
        </View>

        {/* Provider Key Inputs */}
        <Text style={styles.sectionTitle}>API Keys</Text>
        {PROVIDERS.map((provider) => (
          <View key={provider.id} style={styles.providerCard}>
            <View style={styles.providerHeader}>
              <View style={[styles.providerIcon, { backgroundColor: provider.color + '20' }]}>
                <Ionicons
                  name={provider.id === 'gemini' ? 'logo-google' : 'key-outline'}
                  size={18}
                  color={provider.color}
                />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerLimit}>{provider.rateLimit}</Text>
              </View>
              <View style={styles.statusContainer}>
                {isProviderAvailable(provider.id) ? (
                  <View style={styles.statusAvailable}>
                    <Text style={styles.statusAvailableText}>Ready</Text>
                  </View>
                ) : (
                  <View style={styles.statusUnavailable}>
                    <Text style={styles.statusUnavailableText}>Off</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={keys[provider.id] || ''}
                onChangeText={(text) => updateKey(provider.id, text)}
                placeholder={provider.keyPlaceholder}
                placeholderTextColor="#6B7280"
                secureTextEntry={!showKey[provider.id]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  setShowKey((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                }
              >
                <Ionicons
                  name={showKey[provider.id] ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            {isProviderAvailable(provider.id) && (
              <Text style={styles.quotaText}>
                Quota: {getQuotaDisplay(provider.id)}
              </Text>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                // In a real app, use Linking.openURL
                Alert.alert('Get Key', `Open ${provider.docsUrl} in your browser to get a key.`);
              }}
            >
              <Text style={styles.linkText}>Get {provider.name} key →</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Ollama Section */}
        <Text style={styles.sectionTitle}>Local / Self-Hosted</Text>
        <View style={styles.providerCard}>
          <View style={styles.providerHeader}>
            <View style={[styles.providerIcon, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="desktop-outline" size={18} color="#6366F1" />
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>Ollama (Local)</Text>
              <Text style={styles.providerLimit}>Unlimited · No API key</Text>
            </View>
            <View style={styles.statusContainer}>
              {isProviderAvailable('ollama') ? (
                <View style={styles.statusAvailable}>
                  <Text style={styles.statusAvailableText}>Ready</Text>
                </View>
              ) : (
                <View style={styles.statusUnavailable}>
                  <Text style={styles.statusUnavailableText}>Off</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.ollamaHelp}>
            Enter the URL of your Ollama server. Use your PC's local IP if on the same WiFi.
          </Text>
          <TextInput
            style={styles.input}
            value={ollamaUrl}
            onChangeText={setOllamaUrl}
            placeholder="http://192.168.1.100:11434"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />
          <Text style={styles.ollamaHint}>
            Leave empty to use localhost (emulator only).{'\n'}
            Install Ollama from ollama.com
          </Text>
        </View>

        {/* Quota Status Overview */}
        <Text style={styles.sectionTitle}>Quota Overview</Text>
        <View style={styles.quotaCard}>
          {Object.entries(quota).map(([id, q]) => (
            <View key={id} style={styles.quotaRow}>
              <Text style={styles.quotaName}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </Text>
              <View style={styles.quotaBarContainer}>
                <View
                  style={[
                    styles.quotaBar,
                    {
                      width: `${Math.max(5, (q.requestsRemaining / q.requestsPerDay) * 100)}%`,
                      backgroundColor:
                        q.requestsRemaining / q.requestsPerDay > 0.3 ? '#10B981' : '#F59E0B',
                    },
                  ]}
                />
              </View>
              <Text style={styles.quotaValue}>
                {q.requestsRemaining}/{q.requestsPerDay}
              </Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save & Refresh Providers</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetQuota}>
          <Text style={styles.resetButtonText}>Reset All Quotas</Text>
        </TouchableOpacity>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  placeholder: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#BFDBFE',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  providerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  providerLimit: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusContainer: {
    marginLeft: 8,
  },
  statusAvailable: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAvailableText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  statusUnavailable: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusUnavailableText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#475569',
  },
  eyeButton: {
    padding: 10,
    marginLeft: 4,
  },
  quotaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  linkButton: {
    marginTop: 10,
  },
  linkText: {
    color: '#60A5FA',
    fontSize: 13,
  },
  ollamaHelp: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
    lineHeight: 18,
  },
  ollamaHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
  quotaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quotaName: {
    width: 100,
    fontSize: 13,
    color: '#CBD5E1',
  },
  quotaBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  quotaBar: {
    height: '100%',
    borderRadius: 4,
  },
  quotaValue: {
    width: 70,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  resetButtonText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
});
