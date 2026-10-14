import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatHistoryRecord {
  id: string;
  sender: 'user' | 'assistant';
  message: string;
  timestamp: string;
  attachmentInfo?: string;
}

export interface AppSettingsRecord {
  gitToken: string;
  activeRepoUrl: string;
  spreadsheetId: string;
  googleApiKey: string;
}

const LOCAL_CHAT_KEY = '@smart_builder_chat_history';

export const saveChatMessage = async (
  msg: Omit<ChatHistoryRecord, 'id' | 'timestamp'>,
  settings: AppSettingsRecord
): Promise<ChatHistoryRecord> => {
  const newRecord: ChatHistoryRecord = {
    ...msg,
    id: `msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const existingLocal = await AsyncStorage.getItem(LOCAL_CHAT_KEY);
  const chatList: ChatHistoryRecord[] = existingLocal ? JSON.parse(existingLocal) : [];
  chatList.push(newRecord);
  await AsyncStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(chatList));

  if (settings.spreadsheetId && settings.googleApiKey) {
    syncToGoogleSheets(newRecord, settings).catch(() => {
      // Offline fallback: data remains saved in local AsyncStorage
    });
  }

  return newRecord;
};

async function syncToGoogleSheets(
  record: ChatHistoryRecord,
  settings: AppSettingsRecord
): Promise<void> {
  const range = 'ChatHistory!A:E';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${settings.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${settings.googleApiKey}`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: [[record.id, record.sender, record.message, record.timestamp, record.attachmentInfo || 'N/A']],
    }),
  });
}
