// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { initializeAIService } from '@/services/ai';

export default function RootLayout() {
  useEffect(() => {
    initializeAIService().catch(console.error);
  }, []);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <ProjectProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
          </Stack>
        </ProjectProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
