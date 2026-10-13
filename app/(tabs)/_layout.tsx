import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

function TabIcon({ name, color, focused }: { name: keyof typeof MaterialIcons.glyphMap; color: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <MaterialIcons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const tabBarStyle = {
    height: Platform.select({
      ios: insets.bottom + 64,
      android: insets.bottom + 64,
      default: 70,
    }),
    paddingTop: 8,
    paddingBottom: Platform.select({
      ios: insets.bottom + 8,
      android: insets.bottom + 8,
      default: 10,
    }),
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: Typography.weightMedium,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chat-bubble-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'Roadmap',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="track-changes" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="file-download" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabIconFocused: {
    backgroundColor: Colors.primaryDim,
  },
});
