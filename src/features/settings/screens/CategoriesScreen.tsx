import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Modal, TextInput } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import { useTransactionStore } from '../../../../store/useTransactionStore';

export default function CategoriesScreen() {
  const theme = useTheme<AppTheme>();

  const categories = useTransactionStore((state) => state.categories);
  const addCustomCategory = useTransactionStore((state) => state.addCustomCategory);
  const deleteCategory = useTransactionStore((state) => state.deleteCategory);

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🧩');

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === 'expense' && !c.isLocked),
    [categories]
  );

  const openNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName('');
    setEmoji('🧩');
    setModalVisible(true);
  };

  const close = () => setModalVisible(false);

  const save = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addCustomCategory({ name, emoji });
    close();
  };

  return (
    <ScreenLayout title="Categories" backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
              Categories
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular' }}>
              Manage spending categories.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add category"
            style={[styles.addButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
            onPress={openNew}
          >
            <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 12 }}>
              ADD
            </Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Expense</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
              Add or remove custom categories.
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            {expenseCategories.length ? (
              expenseCategories.map((cat) => (
                <View key={cat.id} style={[styles.row, { backgroundColor: theme.colors.surfaceContainer }]}>
                  <View style={styles.rowLeft}>
                    <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                    <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>
                      {cat.name}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete category ${cat.name}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      deleteCategory(cat.id);
                    }}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      {
                        backgroundColor: pressed
                          ? theme.colors.surfaceContainerHighest
                          : theme.colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name="delete" size={18} color={theme.colors.error} />
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>No custom categories yet.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
            <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18 }}>
              New Category
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', marginTop: 8 }}>
              Create an expense category.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TextInput
                value={emoji}
                onChangeText={setEmoji}
                placeholder="🧩"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                style={[styles.input, { width: 64, textAlign: 'center', color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant }]}
              />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant }]}
              />
            </View>

            <View style={styles.modalActions}>
              <Button mode="text" onPress={close}>
                Cancel
              </Button>
              <Button mode="contained" onPress={save} disabled={!name.trim()}>
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 24,
  },
  title: { fontFamily: 'SpaceGrotesk_700Bold' },
  addButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  section: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, padding: 4 },
  sectionHeader: { paddingHorizontal: 24, paddingVertical: 16 },
  sectionTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, letterSpacing: -0.5, marginBottom: 4 },
  sectionContent: { borderRadius: 12, gap: 2, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
