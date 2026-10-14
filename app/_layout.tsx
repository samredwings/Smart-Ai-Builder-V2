import { useEffect } from 'react';
import { initializeAIService } from '@/services/ai';

// Inside your layout component:
useEffect(() => {
  initializeAIService().catch(console.error);
}, []);
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { ProjectProvider } from '@/contexts/ProjectContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <ProjectProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ProjectProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
