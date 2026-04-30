import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
          AI Assistant
        </Text>
      </View>
      <View style={styles.chatArea}>
        <Surface style={[styles.messageBubble, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>
            Hello! I am your AI financial assistant. How can I help you today?
          </Text>
        </Surface>
      </View>
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 16, backgroundColor: theme.colors.surface }]}>
        <TextInput
          mode="outlined"
          placeholder="Ask me anything..."
          style={styles.input}
          outlineStyle={{ borderRadius: 24 }}
        />
        <IconButton icon="send" mode="contained" containerColor={theme.colors.primary} iconColor={theme.colors.onPrimary} onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  chatArea: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    padding: 16,
    borderRadius: 24,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    elevation: 4,
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
});
