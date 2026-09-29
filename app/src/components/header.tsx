import { router, Stack } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { C, FONT_FAMILY } from '@/lib/theme';

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
      <Icon ios="slider.horizontal.3" web="tune" size={15} color={C.ink} />
      <T variant="callout" weight="700" color={C.ink}>
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
      <T variant="headline" weight="700" color={C.ink}>
        닫기
      </T>
    </Pressable>
  );
}

// 네이티브에서는 fontFamily 를 아예 넘기지 않는다 (undefined 를 넘기면 큰 제목이 그려지지 않았다)
const FONT = FONT_FAMILY ? { fontFamily: FONT_FAMILY } : {};

/** 탭마다 하나씩: 큰 제목 헤더 + 시뮬레이터 버튼 */
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeTitleStyle: { ...FONT, fontWeight: '800', color: C.ink },
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
