import React from 'react';
import Svg, { Circle } from 'react-native-svg';

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
  // Cap progress between 0 and 1, ensuring we draw correctly
  const cappedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - cappedProgress * circumference;

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
      <Circle
        stroke={color}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
