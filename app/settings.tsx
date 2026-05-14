import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Divider,
  IconButton,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
  Appbar,
  List,
  Surface,
  Portal,
  Dialog,
  TouchableRipple
} from 'react-native-paper';

import { useSettingsStore } from '../store/useSettingsStore';
import { useTransactionStore } from '../store/useTransactionStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🧩');
  const [isExporting, setIsExporting] = useState(false);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);

  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const secureAccessEnabled = useSettingsStore((state) => state.secureAccessEnabled);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);
  const setHighContrastEnabled = useSettingsStore((state) => state.setHighContrastEnabled);
  const setSecureAccessEnabled = useSettingsStore((state) => state.setSecureAccessEnabled);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const addCustomCategory = useTransactionStore((state) => state.addCustomCategory);
  const deleteCategory = useTransactionStore((state) => state.deleteCategory);
  const clearAllData = useTransactionStore((state) => state.clearAllData);

  const [selectedHue, setSelectedHue] = useState<string>(theme.colors.primary);

  const hues = [
    '#FF5252', // Red
    '#FF7043', // Orange
    '#FFCA28', // Yellow
    '#66BB6A', // Green
    '#26A69A', // Teal
    '#29B6F6', // Light Blue
    '#42A5F5', // Blue
    '#5C6BC0', // Indigo
    '#7E57C2', // Deep Purple
    '#AB47BC', // Purple
    '#EC407A', // Pink
  ];

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const byId = new Map(categories.map((item) => [item.id, item]));
      const header = 'Transaction ID,Date,Time,Type,Category,Item Name,Amount,Currency';
      const lines = transactions.map((item) => {
        const date = new Date(item.timestamp);
        const category = byId.get(item.categoryId);
        const iso = date.toISOString();
        const [day, timeWithZone] = iso.split('T');
        const time = timeWithZone?.slice(0, 8) ?? '';
        const label = category ? `${category.emoji} ${category.name}` : 'Uncategorized';
        const note = (item.note ?? '').replaceAll('"', '""');

        return [
          item.id,
          day,
          time,
          item.type.toUpperCase(),
          `"${label}"`,
          `"${note}"`,
          (item.amountCents / 100).toFixed(2),
          'USD',
        ].join(',');
      });

      const csvContent = [header, ...lines].join('\n');
      const fileUri = `${FileSystem.cacheDirectory}gemwallet_export_${Date.now()}.csv`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Transactions' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Settings" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Card mode="contained" style={{ borderRadius: 28 }}>
          <Card.Title title="Appearance" titleVariant="titleMedium" />
          <Card.Content style={{ gap: 20 }}>
            <View style={{ gap: 12 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Theme Preference</Text>
              <SegmentedButtons
                value={themePreference}
                onValueChange={(value) => setThemePreference(value as 'system' | 'light' | 'dark')}
                buttons={[
                  { label: 'System', value: 'system' },
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                ]}
                style={{ borderRadius: 16 }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodyLarge">OLED True Black</Text>
              <Switch value={oledTrueBlackEnabled} onValueChange={setOledTrueBlackEnabled} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodyLarge">High Contrast Mode</Text>
              <Switch value={highContrastEnabled} onValueChange={setHighContrastEnabled} />
            </View>
          </Card.Content>
        </Card>

        <Card mode="contained" style={{ borderRadius: 28 }}>
          <Card.Title title="Security" titleVariant="titleMedium" />
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodyLarge">Secure App Access</Text>
              <Switch value={secureAccessEnabled} onValueChange={setSecureAccessEnabled} />
            </View>
          </Card.Content>
        </Card>

        <Card mode="contained" style={{ borderRadius: 28 }}>
          <Card.Title title="Categories" titleVariant="titleMedium" />
          <Card.Content style={{ gap: 16 }}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  mode="outlined"
                  label="Name"
                  value={categoryName}
                  onChangeText={setCategoryName}
                  maxLength={14}
                  style={{ flex: 2 }}
                  outlineStyle={{ borderRadius: 16 }}
                />
                <TextInput
                  mode="outlined"
                  label="Emoji"
                  value={categoryEmoji}
                  onChangeText={setCategoryEmoji}
                  maxLength={2}
                  style={{ flex: 1, textAlign: 'center' }}
                  outlineStyle={{ borderRadius: 16 }}
                />
              </View>

              <View style={{ gap: 8 }}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Tonal Tint</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
                  {hues.map((hue) => (
                    <TouchableRipple
                      key={hue}
                      onPress={() => setSelectedHue(hue)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: hue,
                        borderWidth: selectedHue === hue ? 3 : 0,
                        borderColor: theme.colors.outline,
                        overflow: 'hidden'
                      }}
                    >
                      <View style={{ flex: 1 }} />
                    </TouchableRipple>
                  ))}
                </ScrollView>
              </View>

              <Button
                mode="contained"
                onPress={async () => {
                  if (!categoryName.trim()) return;
                  addCustomCategory({ name: categoryName, emoji: categoryEmoji });
                  setCategoryName('');
                  setCategoryEmoji('🧩');
                  await Haptics.selectionAsync();
                }}
                style={{ borderRadius: 20, marginTop: 4 }}
                contentStyle={{ height: 48 }}
              >
                Create Category
              </Button>
            </View>
            
            <Divider style={{ marginVertical: 8 }} />
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {categories
                .filter((item) => item.kind === 'expense')
                .map((item) => (
                  <Surface
                    key={item.id}
                    style={{ 
                      borderRadius: 20, 
                      padding: 12, 
                      width: (SCREEN_WIDTH - 60) / 2,
                      backgroundColor: theme.colors.surfaceVariant,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    elevation={0}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                      <Text variant="labelLarge" numberOfLines={1} style={{ maxWidth: 80 }}>{item.name}</Text>
                    </View>
                    {!item.isLocked && (
                      <IconButton 
                        icon="close-circle-outline" 
                        size={20} 
                        onPress={() => deleteCategory(item.id)} 
                        style={{ margin: -8 }}
                      />
                    )}
                  </Surface>
                ))}
            </View>
          </Card.Content>
        </Card>

        <Card mode="contained" style={{ borderRadius: 28 }}>
          <Card.Title title="Data Management" titleVariant="titleMedium" />
          <Card.Content style={{ gap: 12 }}>
            <Button
              mode="contained-tonal"
              icon="file-export-outline"
              loading={isExporting}
              onPress={exportCsv}
              style={{ borderRadius: 16 }}
              contentStyle={{ height: 48 }}
            >
              Export CSV File
            </Button>
            
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={() => setResetDialogVisible(true)}
              style={{ borderRadius: 16, marginTop: 4 }}
              contentStyle={{ height: 48 }}
            >
              Reset All Wallet Data
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)} style={{ borderRadius: 28 }}>
          <Dialog.Icon icon="alert-outline" color={theme.colors.error} />
          <Dialog.Title style={{ textAlign: 'center' }}>Clear all data?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              This action is permanent and will delete all your transactions and settings.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetDialogVisible(false)}>Cancel</Button>
            <Button 
              textColor={theme.colors.error}
              onPress={async () => {
                clearAllData();
                resetSettings();
                setResetDialogVisible(false);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                router.replace('/');
              }}
            >
              Delete Everything
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
