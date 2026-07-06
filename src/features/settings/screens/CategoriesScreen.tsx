import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { BouncyButton } from '../../../components/UI/BouncyButton';

import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { formatAppCurrency } from '../../../../utils/currency';
import { Category } from '../../../../types/finance';

export default function CategoriesScreen() {
  const theme = useTheme<AppTheme>();

  const categories = useTransactionStore((state) => state.categories);
  const addCustomCategory = useTransactionStore((state) => state.addCustomCategory);
  const deleteCategory = useTransactionStore((state) => state.deleteCategory);
  const setCategoryBudget = useTransactionStore((state) => state.setCategoryBudget);

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🧩');

  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [budgetLimitText, setBudgetLimitText] = useState('');

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

  const saveBudget = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedCategory) {
      const val = budgetLimitText.trim();
      if (val === '') {
        setCategoryBudget(selectedCategory.id, undefined);
      } else {
        const parsed = parseFloat(val);
        const cents = !isNaN(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
        setCategoryBudget(selectedCategory.id, cents);
      }
    }
    setBudgetModalVisible(false);
    setSelectedCategory(null);
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
          <BouncyButton
            accessibilityRole="button"
            accessibilityLabel="Add category"
            style={[styles.addButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
            onPress={openNew}
          >
            <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 12 }}>
              ADD
            </Text>
          </BouncyButton>
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
                  <BouncyButton
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(cat);
                      setBudgetLimitText(
                        cat.maxBudgetLimitCents !== undefined
                          ? (cat.maxBudgetLimitCents / 100).toString()
                          : ''
                      );
                      setBudgetModalVisible(true);
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>
                        {cat.name}
                      </Text>
                      {cat.maxBudgetLimitCents !== undefined && (
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontFamily: 'BeVietnamPro_400Regular' }}>
                          Limit: {formatAppCurrency(cat.maxBudgetLimitCents)}
                        </Text>
                      )}
                    </View>
                  </BouncyButton>
                  <BouncyButton
                    accessibilityRole="button"
                    accessibilityLabel={`Delete category ${cat.name}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(
                        'Delete Category',
                        `Are you sure you want to delete "${cat.name}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(cat.id) },
                        ]
                      );
                    }}
                    style={[
                      styles.deleteButton,
                      { backgroundColor: theme.colors.surfaceContainerHigh },
                    ]}
                  >
                    <MaterialCommunityIcons name="delete" size={18} color={theme.colors.error} />
                  </BouncyButton>
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
        <BlurView intensity={20} tint={theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Pressable style={[styles.modalBackdrop, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]} onPress={close}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.surfaceContainerHigh }]} onPress={() => undefined}>
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
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={budgetModalVisible} transparent animationType="fade" onRequestClose={() => setBudgetModalVisible(false)}>
        <BlurView intensity={20} tint={theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Pressable style={[styles.modalBackdrop, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]} onPress={() => setBudgetModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.surfaceContainerHigh }]} onPress={() => undefined}>
            <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18 }}>
              {selectedCategory?.name} Budget Limit
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', marginTop: 8 }}>
              Set a monthly spending limit for this category. Leave empty to clear.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TextInput
                value={budgetLimitText}
                onChangeText={setBudgetLimitText}
                placeholder="e.g. 150.00"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                style={[styles.input, { flex: 1, color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant }]}
              />
            </View>

            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => setBudgetModalVisible(false)}>
                Cancel
              </Button>
              <Button mode="contained" onPress={saveBudget}>
                Save
              </Button>
            </View>
          </Pressable>
        </Pressable>
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
