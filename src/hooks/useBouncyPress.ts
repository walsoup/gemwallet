import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export function useBouncyPress(scaleDown = 0.92) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(scaleDown, { damping: 10, stiffness: 520, mass: 0.7 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 360, mass: 0.8 });
  };

  return { animatedStyle, onPressIn, onPressOut };
}
