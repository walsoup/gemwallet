import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type AppIconName = 'dashboard' | 'graveyard' | 'auditor' | 'settings' | 'add';

type AppIconProps = {
  name: AppIconName;
  color: string;
  size?: number;
};

export function AppIcon({ name, color, size = 24 }: AppIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'dashboard' ? (
        <>
          <Rect x="3" y="3" width="8" height="8" rx="1.5" stroke={color} strokeWidth={2} />
          <Rect x="13" y="3" width="8" height="8" rx="1.5" stroke={color} strokeWidth={2} />
          <Rect x="3" y="13" width="8" height="8" rx="1.5" stroke={color} strokeWidth={2} />
          <Rect x="13" y="13" width="8" height="8" rx="1.5" stroke={color} strokeWidth={2} />
        </>
      ) : null}

      {name === 'graveyard' ? (
        <>
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
          <Line x1="6" y1="18" x2="18" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      ) : null}

      {name === 'auditor' ? (
        <>
          <Path
            d="M2.5 12c2.4-3.8 5.6-5.7 9.5-5.7s7.1 1.9 9.5 5.7c-2.4 3.8-5.6 5.7-9.5 5.7S4.9 15.8 2.5 12Z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={2} />
        </>
      ) : null}

      {name === 'settings' ? (
        <>
          <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth={2} />
          <Path
            d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={2} />
        </>
      ) : null}

      {name === 'add' ? (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </>
      ) : null}
    </Svg>
  );
}
