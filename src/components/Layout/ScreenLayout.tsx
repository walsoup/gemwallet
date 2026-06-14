import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomTopNav } from '../Navigation/CustomTopNav';
import { TOP_NAV_ESTIMATED_HEIGHT, BOTTOM_NAV_ESTIMATED_HEIGHT } from './navHeights';
import { useKeyboard } from '../../utils/useKeyboard';

type Props = PropsWithChildren<{
  title: string;
  backgroundColor?: string;
  contentContainerStyle?: ViewStyle;
}>;

export function ScreenLayout({ title, backgroundColor, contentContainerStyle, children }: Props) {
  const { isKeyboardVisible } = useKeyboard();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
      <CustomTopNav title={title} />
      <View
        style={[
          {
            paddingTop: insets.top + TOP_NAV_ESTIMATED_HEIGHT,
            paddingBottom: isKeyboardVisible ? insets.bottom : insets.bottom + BOTTOM_NAV_ESTIMATED_HEIGHT,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

