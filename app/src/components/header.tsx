import { router, Stack } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { C } from '@/lib/theme';

import { Icon, T } from './ui';

/** 모든 탭 헤더 오른쪽: 데모 진행용 운영 시뮬레이터 */
export function SimulatorButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="운영 시뮬레이터 열기"
      accessibilityHint="데모 진행용 화면입니다. 실제 운영자 기능이 아닙니다."
      hitSlop={8}
      onPress={() => router.push('/simulator')}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}>
      <Icon ios="slider.horizontal.3" web="tune" size={15} color={C.primary} />
      <T variant="callout" weight="600" color={C.primary}>
        운영 시뮬레이터
      </T>
    </Pressable>
  );
}

export function CloseButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="닫기"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}>
      <T variant="headline" weight="600" color={C.primary}>
        닫기
      </T>
    </Pressable>
  );
}

/** 탭마다 하나씩: 큰 제목 헤더 + 시뮬레이터 버튼 */
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        contentStyle: { backgroundColor: C.bg },
        headerRight: () => <SimulatorButton />,
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 8,
    paddingVertical: 4,
  },
});
