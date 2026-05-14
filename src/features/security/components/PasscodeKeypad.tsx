import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppTheme } from '../../../../providers/AppThemeProvider';

type Props = {
  theme: AppTheme;
  value: string;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
};

const DIGITS: (string | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'back'];

export function PasscodeKeypad({ theme, value, onDigit, onBackspace }: Props) {
  return (
    <View style={styles.keypad}>
      {DIGITS.map((digit, idx) => {
        if (digit === null) {
          return <View key={`spacer-${idx}`} style={styles.keypadCell} />;
        }

        if (digit === 'back') {
          return (
            <View key={`back-${idx}`} style={styles.keypadCell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete digit"
                style={({ pressed }) => [
                  styles.keyButton,
                  {
                    backgroundColor: pressed
                      ? theme.colors.surfaceContainerHigh
                      : theme.colors.surfaceContainer,
                  },
                ]}
                onPress={onBackspace}
                disabled={value.length === 0}
              >
                <MaterialCommunityIcons
                  name="backspace-outline"
                  size={22}
                  color={value.length === 0 ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                />
              </Pressable>
            </View>
          );
        }

        return (
          <View key={digit} style={styles.keypadCell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Digit ${digit}`}
              style={({ pressed }) => [
                styles.keyButton,
                {
                  backgroundColor: pressed
                    ? theme.colors.surfaceContainerHigh
                    : theme.colors.surfaceContainer,
                },
              ]}
              onPress={() => onDigit(digit)}
            >
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 22 }}>
                {digit}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 24,
  },
  keypadCell: {
    width: '28%',
    alignItems: 'center',
  },
  keyButton: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
