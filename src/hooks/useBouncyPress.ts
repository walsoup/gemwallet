import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function useBouncyPress(scaleDown = 0.95, disabled = false) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withSpring(disabled ? 0.5 : 1),
  }));

  const onPressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(scaleDown, { 
      damping: 15, 
      stiffness: 300, 
      mass: 0.5 
    });
  };

  const onPressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { 
      damping: 12, 
      stiffness: 200, 
      mass: 0.8 
    });
  };

  return { animatedStyle, onPressIn, onPressOut };
}
