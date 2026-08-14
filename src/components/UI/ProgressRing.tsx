import React, { useEffect } from 'react';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color: string;
  trackColor: string;
}

export function ProgressRing({ size, strokeWidth, progress, color, trackColor }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cappedProgress = Math.min(Math.max(progress, 0), 1);
  const targetOffset = circumference - cappedProgress * circumference;

  const animatedOffset = useSharedValue(targetOffset);

  useEffect(() => {
    animatedOffset.value = withTiming(targetOffset, { duration: 500 });
  }, [targetOffset, animatedOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  return (
    <Svg width={size} height={size}>
      <Circle
        stroke={trackColor}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <AnimatedCircle
        stroke={color}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
