import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import type { Transaction } from '../types/finance';

type Props = {
  transactions: Transaction[];
};

export function SpendingChart({ transactions }: Props) {
  const last = useMemo(() => transactions.slice(0, 6), [transactions]);
  const max = useMemo(() => Math.max(...last.map((x) => x.amount), 1), [last]);

  return (
    <View style={{ borderRadius: 24, padding: 12 }}>
      <Text variant="titleMedium" style={{ marginBottom: 8 }}>
        Adaptive Spending Bars
      </Text>
      <Svg width="100%" height={170} viewBox="0 0 360 170">
        {last.map((item, index) => {
          const barHeight = (item.amount / max) * 100;
          const x = 10 + index * 58;
          return (
            <>
              <Rect
                key={`${item.id}-bar`}
                x={x}
                y={130 - barHeight}
                width={40}
                height={barHeight}
                rx={16}
                ry={16}
              />
              <SvgText key={`${item.id}-label`} x={x + 4} y={150} fontSize={10}>
                {item.category}
              </SvgText>
            </>
          );
        })}
      </Svg>
    </View>
  );
}
