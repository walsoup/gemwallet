import React, { useState, useEffect, useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { BouncyButton } from '../../../components/UI/BouncyButton';
import { Modal, Pressable, StyleSheet, TextInput, View, ScrollView } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppTheme } from '../../../../providers/AppThemeProvider';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { Transaction } from '../../../../types/finance';
import { formatAppCurrency } from '../../../../utils/currency';
import { ProgressRing } from '../../../components/UI/ProgressRing';

interface Props {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, visible, onClose }: Props) {
  const theme = useTheme<AppTheme>();
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  
  const updateTransaction = useTransactionStore(state => state.updateTransaction);
  const undoTransaction = useTransactionStore(state => state.undoTransaction);
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
    if (transaction && visible) {
      setIsEditing(false);
      setEditAmount((transaction.amountCents / 100).toString());
      setEditNote(transaction.note || '');
      setEditCategoryId(transaction.categoryId);
      setEditType(transaction.type);
    }
  }, [transaction, visible]);

  if (!transaction) return null;

  const category = categories.find(c => c.id === transaction.categoryId);
  const isIncome = transaction.type === 'income';

  const handleSave = () => {
    const parsedAmount = Number(editAmount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const amountCents = Math.round(parsedAmount * 100);
    const oldAmountCents = transaction.amountCents;
    const oldCategoryId = transaction.categoryId;
    const oldType = transaction.type;

    if (editType === 'expense') {
      const cat = categories.find(c => c.id === editCategoryId);
      const budgetLimit = cat?.maxBudgetLimitCents;
      if (budgetLimit && budgetLimit > 0) {
        const currentSpent = currentMonthSpentByCategory[editCategoryId] || 0;
        const adjustCents = (oldCategoryId === editCategoryId && oldType === 'expense') ? oldAmountCents : 0;
        const spentAfterTx = currentSpent - adjustCents + amountCents;

        if (spentAfterTx >= budgetLimit) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (spentAfterTx >= 0.8 * budgetLimit) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    }

    updateTransaction({
      id: transaction.id,
      amountCents,
      note: editNote.trim() || undefined,
      categoryId: editCategoryId,
      type: editType,
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleDelete = () => {
    undoTransaction(transaction.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
              Transaction Details
            </Text>
            <BouncyButton onPress={() => setIsEditing(!isEditing)} style={styles.editBtn}>
              <MaterialCommunityIcons 
                name={isEditing ? "close" : "pencil"} 
                size={20} 
                color={theme.colors.onSurfaceVariant} 
              />
            </BouncyButton>
          </View>

          {isEditing ? (
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
              />
              
              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <Pressable
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
                </Pressable>
                <Pressable
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
                </Pressable>
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
                      <Pressable
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
                      </Pressable>
                    );
                  })}
              </ScrollView>

              <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Note</Text>
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
              />
              <View style={styles.modalActions}>
                <Button mode="text" onPress={() => setIsEditing(false)} textColor={theme.colors.onSurfaceVariant}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleSave}>
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.detailsView}>
              <View style={styles.detailRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Type</Text>
                <Text style={{ color: isIncome ? theme.colors.tertiary : theme.colors.error, fontFamily: 'BeVietnamPro_500Medium' }}>
                  {isIncome ? 'Income' : 'Expense'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Category</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                    {category?.maxBudgetLimitCents && category.maxBudgetLimitCents > 0 && (
                      <View style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
                        <ProgressRing
                          size={32}
                          strokeWidth={2}
                          progress={(currentMonthSpentByCategory[category.id] || 0) / category.maxBudgetLimitCents}
                          color={(currentMonthSpentByCategory[category.id] || 0) >= 0.8 * category.maxBudgetLimitCents ? theme.colors.error : theme.colors.primary}
                          trackColor={(currentMonthSpentByCategory[category.id] || 0) >= 0.8 * category.maxBudgetLimitCents ? theme.colors.errorContainer : theme.colors.surfaceContainerHighest}
                        />
                      </View>
                    )}
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: theme.colors.surfaceContainerHighest,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: 16 }}>{category?.emoji}</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.onSurface }}>{category?.name || 'Unknown'}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Amount</Text>
                <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 18 }}>
                  {formatAppCurrency(transaction.amountCents)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Date</Text>
                <Text style={{ color: theme.colors.onSurface }}>
                  {new Date(transaction.timestamp).toLocaleString()}
                </Text>
              </View>
              {transaction.note && (
                <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Note</Text>
                  <Text style={{ color: theme.colors.onSurface }}>{transaction.note}</Text>
                </View>
              )}
              
              <Button 
                mode="outlined" 
                textColor={theme.colors.error} 
                style={{ borderColor: theme.colors.error, marginTop: 24 }}
                onPress={handleDelete}
              >
                Delete Transaction
              </Button>
            </View>
          )}
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
  detailsView: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
