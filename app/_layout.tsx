// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeAIService } from '@/services/ai';

export default function RootLayout() {
  useEffect(() => {
    initializeAIService().catch(console.error);
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{ title: 'Settings', presentation: 'modal' }}
      />
      <Stack.Screen
        name="model-manager"
        options={{ title: 'Model Manager', presentation: 'modal' }}
      />
      <Stack.Screen
        name="preview"
        options={{ title: 'Preview', presentation: 'modal' }}
      />
      <Stack.Screen
        name="import"
        options={{ title: 'Import Project', presentation: 'modal' }}
      />
    </Stack>
  );
}
