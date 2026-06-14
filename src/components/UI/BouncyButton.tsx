import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useBouncyPress } from '../../hooks/useBouncyPress';

interface BouncyButtonProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleDown?: number;
}

export const BouncyButton = ({ onPress, style, children, disabled, scaleDown = 0.95, ...props }: BouncyButtonProps) => {
  const { animatedStyle, onPressIn, onPressOut } = useBouncyPress(scaleDown, disabled || false);
  
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
