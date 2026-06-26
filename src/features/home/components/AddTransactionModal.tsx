import React, { useState, useEffect, useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { BouncyButton } from '../../../components/UI/BouncyButton';
import { Modal, Pressable, StyleSheet, TextInput, View, ScrollView } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppTheme } from '../../../../providers/AppThemeProvider';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { ProgressRing } from '../../../components/UI/ProgressRing';

interface Props {
  visible: boolean;
  initialType?: 'income' | 'expense';
  onClose: () => void;
}

export function AddTransactionModal({ visible, initialType = 'expense', onClose }: Props) {
  const theme = useTheme<AppTheme>();
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>(initialType);

  const addExpense = useTransactionStore(state => state.addExpense);
  const addIncome = useTransactionStore(state => state.addIncome);
  const categories = useTransactionStore(state => state.categories);
  const transactions = useTransactionStore(state => state.transactions);

  const currentMonthSpentByCategory = useMemo(() => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const map: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.timestamp >= startOfMonth) {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amountCents;
      }
    });
    return map;
  }, [transactions]);

  useEffect(() => {
    if (visible) {
      setEditAmount('');
      setEditNote('');
      setEditType(initialType);
      const targetCats = categories.filter(c => initialType === 'income' ? c.kind === 'income' : (c.kind === 'expense' || c.kind === 'system'));
      setEditCategoryId(targetCats[0]?.id || '');
    }
  }, [visible, initialType, categories]);

  const handleSave = () => {
    const parsedAmount = Number(editAmount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const amountCents = Math.round(parsedAmount * 100);

    if (editType === 'expense') {
      const cat = categories.find(c => c.id === editCategoryId);
      const budgetLimit = cat?.maxBudgetLimitCents;
      if (budgetLimit && budgetLimit > 0) {
        const currentSpent = currentMonthSpentByCategory[editCategoryId] || 0;
        const spentAfterTx = currentSpent + amountCents;

        if (spentAfterTx >= budgetLimit) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (spentAfterTx >= 0.8 * budgetLimit) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
      addExpense({
        amountCents,
        note: editNote.trim() || undefined,
        categoryId: editCategoryId,
      });
    } else {
      addIncome({
        amountCents,
        note: editNote.trim() || undefined,
        categoryId: editCategoryId,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView
        intensity={20}
        tint={theme.dark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        style={[styles.modalBackdrop, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.modalCard, { backgroundColor: theme.colors.surfaceContainerHigh, borderColor: theme.colors.outlineVariant }]}
          onPress={() => undefined}
        >
          <View style={styles.header}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Add Transaction
            </Text>
            <BouncyButton
              onPress={onClose}
              style={styles.editBtn}
              accessibilityRole="button"
              accessibilityLabel="Close add transaction modal"
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </BouncyButton>
          </View>

          <View style={styles.editForm}>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Amount</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              keyboardType="decimal-pad"
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="$0.00"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              autoFocus
            />

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <BouncyButton
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditType('expense');
                  const targetCats = categories.filter(c => c.kind === 'expense' || c.kind === 'system');
                  if (!targetCats.some(c => c.id === editCategoryId)) {
                    setEditCategoryId(targetCats[0]?.id || '');
                  }
                }}
                style={[
                  styles.typeToggleBtn,
                  editType === 'expense'
                    ? { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }
                    : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                ]}
              >
                <Text style={{
                  color: editType === 'expense' ? theme.colors.onErrorContainer : theme.colors.onSurface,
                  fontFamily: 'BeVietnamPro_500Medium'
                }}>
                  Expense
                </Text>
              </BouncyButton>
              <BouncyButton
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditType('income');
                  const targetCats = categories.filter(c => c.kind === 'income');
                  if (!targetCats.some(c => c.id === editCategoryId)) {
                    setEditCategoryId(targetCats[0]?.id || '');
                  }
                }}
                style={[
                  styles.typeToggleBtn,
                  editType === 'income'
                    ? { backgroundColor: theme.colors.tertiary + '1A', borderColor: theme.colors.tertiary }
                    : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                ]}
              >
                <Text style={{
                  color: editType === 'income' ? theme.colors.tertiary : theme.colors.onSurface,
                  fontFamily: 'BeVietnamPro_500Medium'
                }}>
                  Income
                </Text>
              </BouncyButton>
            </View>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
              {categories
                .filter(c => editType === 'income' ? c.kind === 'income' : (c.kind === 'expense' || c.kind === 'system'))
                .map(c => {
                  const isSelected = c.id === editCategoryId;
                  const budgetLimit = c.maxBudgetLimitCents;
                  const spent = currentMonthSpentByCategory[c.id] || 0;
                  const isWarning = budgetLimit && budgetLimit > 0 && spent >= 0.8 * budgetLimit;

                  return (
                    <BouncyButton
                      key={c.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditCategoryId(c.id);
                      }}
                      style={[
                        styles.categoryChip,
                        isSelected
                          ? { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }
                          : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                      ]}
                    >
                      <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                        {budgetLimit && budgetLimit > 0 && (
                          <View style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
                            <ProgressRing
                              size={32}
                              strokeWidth={2}
                              progress={spent / budgetLimit}
                              color={isWarning ? theme.colors.error : theme.colors.primary}
                              trackColor={isWarning ? theme.colors.errorContainer : theme.colors.surfaceContainerHighest}
                            />
                          </View>
                        )}
                        <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                      </View>
                      <Text style={{
                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        fontFamily: 'BeVietnamPro_500Medium',
                        fontSize: 14,
                        marginLeft: 4
                      }}>
                        {c.name}
                      </Text>
                    </BouncyButton>
                  );
                })}
            </ScrollView>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Note (Optional)</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="What was this for?"
              placeholderTextColor={theme.colors.onSurfaceVariant}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={onClose} textColor={theme.colors.onSurfaceVariant}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSave}>
                Save
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editBtn: {
    padding: 8,
  },
  editForm: {
    gap: 4,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
});
