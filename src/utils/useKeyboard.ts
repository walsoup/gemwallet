import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

export function useKeyboard() {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onKeyboardShow = (e: KeyboardEvent) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    };

    const onKeyboardHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener('keyboardDidShow', onKeyboardShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', onKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}
