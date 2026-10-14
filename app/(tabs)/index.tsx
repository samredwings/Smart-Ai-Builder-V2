// app/(tabs)/index.tsx
// Chat screen with real AI streaming, provider indicators, and multi-provider fallback

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  streamAiResponse,
  getAvailableProviders,
  getQuotaStatus,
  initializeAIService,
} from '@/services/ai';
import { useRouter } from 'expo-router';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  provider?: string;
  model?: string;
  isStreaming?: boolean;
  error?: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Check available providers on mount
  useEffect(() => {
    const checkProviders = async () => {
      try {
        await initializeAIService();
        const providers = getAvailableProviders();
        setAvailableProviders(providers);
      } catch (e) {
        console.warn('AI init failed:', e);
      }
    };
    checkProviders();
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
    };

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    // Build context from previous messages
    const context = messages
      .map((m) => `${m.role}: ${m.text}`)
      .join('\n');

    try {
      const result = await streamAiResponse(
        userMsg.text,
        (chunk, providerId) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              last.text = chunk;
              last.provider = providerId;
            }
            return updated;
          });
          scrollToBottom();
        },
        context
      );

      // Finalize the message
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          last.text = result.fullText;
          last.provider = result.provider;
          last.model = result.model;
          last.isStreaming = false;
        }
        return updated;
      });
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          last.text = `Error: ${err?.message || 'Failed to get AI response'}\n\nMake sure you have added API keys in Settings.`;
          last.isStreaming = false;
          last.error = true;
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      // Refresh available providers (quota may have changed)
      setAvailableProviders(getAvailableProviders());
    }
  };

  const getProviderColor = (provider?: string) => {
    switch (provider) {
      case 'gemini': return '#4285F4';
      case 'groq': return '#F55036';
      case 'openrouter': return '#10B981';
      case 'huggingface': return '#FFD21E';
      case 'ollama': return '#6366F1';
      default: return '#9CA3AF';
    }
  };

  const getProviderLabel = (provider?: string) => {
    switch (provider) {
      case 'gemini': return 'Gemini';
      case 'groq': return 'Groq';
      case 'openrouter': return 'OpenRouter';
      case 'huggingface': return 'HuggingFace';
      case 'ollama': return 'Ollama';
      default: return 'AI';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="hardware-chip-outline" size={20} color="#6366F1" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
              item.error && styles.errorText,
            ]}
          >
            {item.text || (item.isStreaming ? 'Thinking...' : '')}
          </Text>

          {!isUser && item.provider && !item.isStreaming && (
            <View style={styles.providerBadge}>
              <View
                style={[
                  styles.providerDot,
                  { backgroundColor: getProviderColor(item.provider) },
                ]}
              />
              <Text style={styles.providerText}>
                {getProviderLabel(item.provider)}
                {item.model ? ` · ${item.model}` : ''}
              </Text>
            </View>
          )}

          {!isUser && item.isStreaming && (
            <ActivityIndicator
              size="small"
              color="#6366F1"
              style={styles.streamingIndicator}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with provider status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Smart AI Builder</Text>
          <View style={styles.providerRow}>
            {availableProviders.length > 0 ? (
              <>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>
                  {availableProviders.length} provider{availableProviders.length > 1 ? 's' : ''} ready
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.statusText, { color: '#EF4444' }]}>
                  No providers configured
                </Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.set
