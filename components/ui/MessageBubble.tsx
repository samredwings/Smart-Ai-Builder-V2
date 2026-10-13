import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { Message } from '@/services/projectService';

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamText?: string;
}

function parseMarkdownBasic(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {line.slice(2, -2)}{'\n'}
        </Text>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <Text key={i} style={styles.bullet}>
          {'•  '}{line.slice(2)}{'\n'}
        </Text>
      );
    }
    if (line === '') {
      return <Text key={i}>{'\n'}</Text>;
    }
    // Handle inline bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <Text key={i}>
        {parts.map((p, j) =>
          j % 2 === 1
            ? <Text key={j} style={styles.bold}>{p}</Text>
            : <Text key={j}>{p}</Text>
        )}
        {'\n'}
      </Text>
    );
  });
}

export const MessageBubble = memo(function MessageBubble({ message, isStreaming, streamText }: Props) {
  const isUser = message.role === 'user';
  const displayText = isStreaming ? (streamText ?? '') : message.content;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {parseMarkdownBasic(displayText)}
        </Text>
        {isStreaming && <Text style={styles.cursor}>▋</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.base,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryDim,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 9,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: Typography.fontSizeSm,
    lineHeight: 20,
  },
  userText: {
    color: '#000000',
    fontWeight: Typography.weightMedium,
  },
  aiText: {
    color: Colors.text,
  },
  bold: {
    fontWeight: Typography.weightBold,
    color: Colors.text,
  },
  bullet: {
    color: Colors.textSecondary,
  },
  cursor: {
    color: Colors.accent,
    fontSize: Typography.fontSizeBase,
  },
});
