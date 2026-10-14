// app/(tabs)/index.tsx
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

    const context = messages.map((m) => `${m.role}: ${m.text}`).join('\n');

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

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={48} color="#4B5563" />
      <Text style={styles.emptyTitle}>Start Building</Text>
      <Text style={styles.emptySubtitle}>
        Describe a component, feature, or paste code for analysis. Your AI co-builder is ready.
      </Text>
      {availableProviders.length === 0 ? (
        <TouchableOpacity
          style={styles.setupButton}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.setupButtonText}>Configure API Keys</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#E5E7EB" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your app idea..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: 0.3,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  setupButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    borderRadius: 20,
  },
  setupButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#111827',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#F9FAFB',
  },
  assistantText: {
    color: '#E5E7EB',
  },
  errorText: {
    color: '#F87171',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  providerText: {
    fontSize: 10,
    color: '#6B7280',
  },
  streamingIndicator: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#0A0A0A',
  },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F9FAFB',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
