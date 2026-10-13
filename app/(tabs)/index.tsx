import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { MessageBubble } from '@/components';
import { useProject } from '@/hooks/useProject';
import type { Message } from '@/services/projectService';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `**App Forge Co-builder**\n\nDescribe changes or ask me to build features. Examples:\n\n- "Add a dashboard tab with stats"\n- "Make the theme darker with green accents"\n- "Add persistence so entries survive restarts"\n- "Create a catalog tab for our items"\n\nYou can also describe entirely new screens and I will build them out.`,
  createdAt: new Date().toISOString(),
};

const QUICK_PROMPTS = [
  'Add a dashboard tab',
  'Dark theme with accents',
  'Persist data locally',
  'Add a catalog screen',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { project, isSending, streamingText, sendMessage } = useProject();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const messages = project?.messages ?? [];
  const displayMessages = messages.length === 0 ? [WELCOME_MESSAGE] : messages;

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length, streamingText]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    sendMessage(text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMark}>
            <Text style={styles.logoChar}>⬡</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>App Forge</Text>
            <Text style={styles.headerSub}>AI Co-builder</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, isSending && styles.statusBadgeActive]}>
          {isSending
            ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 4 }} />
            : <View style={styles.statusDot} />
          }
          <Text style={[styles.statusText, isSending && styles.statusTextActive]}>
            {isSending ? 'Thinking...' : 'Ready'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      >
        {displayMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isSending && streamingText.length > 0 && (
          <MessageBubble
            message={{ id: 'stream', role: 'assistant', content: streamingText, createdAt: '' }}
            isStreaming
            streamText={streamingText}
          />
        )}
        {isSending && streamingText.length === 0 && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingAvatar}>
              <Text style={styles.typingAvatarText}>AI</Text>
            </View>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>Refining app...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick prompts */}
      {messages.length === 0 && !isSending && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickScroll}
          contentContainerStyle={styles.quickContent}
        >
          {QUICK_PROMPTS.map((p) => (
            <Pressable
              key={p}
              onPress={() => sendMessage(p)}
              style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.quickChipText}>{p}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe a feature or paste code..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={1000}
            editable={!isSending}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isSending}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || isSending) && styles.sendBtnDisabled,
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <MaterialIcons
              name="arrow-upward"
              size={20}
              color={(!input.trim() || isSending) ? Colors.textMuted : '#000'}
            />
          </Pressable>
        </View>
        <Text style={styles.inputHint}>Shift+Enter for new line · Enter to send</Text>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChar: {
    fontSize: 18,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.weightBold,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  statusBadgeActive: {
    borderColor: Colors.primary + '60',
    backgroundColor: Colors.primaryDim,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    fontWeight: Typography.weightMedium,
  },
  statusTextActive: {
    color: Colors.primary,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  typingAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingAvatarText: {
    fontSize: 9,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  typingText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textSecondary,
  },
  quickScroll: {
    flexShrink: 0,
    maxHeight: 52,
  },
  quickContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textSecondary,
    fontWeight: Typography.weightMedium,
  },
  inputArea: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontSize: Typography.fontSizeSm,
    color: Colors.text,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.card,
    shadowOpacity: 0,
  },
  inputHint: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
});
