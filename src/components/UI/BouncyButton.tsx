import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BouncyButtonProps extends PressableProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function BouncyButton({
  children,
  style,
  scaleTo = 0.95,
  contentContainerStyle,
  onPressIn,
  onPressOut,
  ...rest
}: BouncyButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300, mass: 0.5 });
        opacity.value = withSpring(0.8, { damping: 15, stiffness: 300 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300, mass: 0.5 });
        opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
