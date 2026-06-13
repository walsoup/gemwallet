import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { formatAppCurrency } from '../../../utils/currency';

interface AnimatedBalanceProps {
  valueCents: number;
  textStyle?: any;
}

export function AnimatedBalance({ valueCents, textStyle }: AnimatedBalanceProps) {
  const theme = useTheme();
  const [displayValue, setDisplayValue] = useState(valueCents);
  const animatedValue = useRef(new Animated.Value(valueCents)).current;

  useEffect(() => {
    animatedValue.addListener((state) => {
      setDisplayValue(state.value);
    });
    
    Animated.spring(animatedValue, {
      toValue: valueCents,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    return () => {
      animatedValue.removeAllListeners();
    };
  }, [valueCents, animatedValue]);

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: theme.colors.onSurface }, textStyle]}>
        {formatAppCurrency(Math.round(displayValue))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
