import { useLocalSearchParams } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useApp } from '@/lib/store';
import { MAX_WIDTH, SPACE } from '@/lib/theme';
import { themed, useTheme } from '@/lib/theme-context';

import { StorageBanner } from './storage-banner';

// ───────── 화면 틀 ─────────

// ?section=<이름> 으로 열면 같은 이름의 <ScrollTarget> 까지 바로 내려간다 (알림·안내에서 화면 중간으로 보낼 때)
const ScrollTargetContext = createContext<((name: string, y: number) => void) | null>(null);

export function Screen({ children, scrollRef }: { children: ReactNode; scrollRef?: RefObject<ScrollView | null> }) {
  const { ready } = useApp();
  const t = useTheme();
  const styles = useStyles();
  const own = useRef<ScrollView>(null);
  const ref = scrollRef ?? own;
  const { section } = useLocalSearchParams<{ section?: string }>();
  // 이름마다 위치를 적어 둔다 — 위치가 먼저 잡히고 section 이 나중에 와도 내려갈 수 있게
  const [targets, setTargets] = useState<Record<string, number>>({});
  const report = useCallback((name: string, y: number) => {
    setTargets((prev) => (prev[name] === y ? prev : { ...prev, [name]: y }));
  }, []);
  const targetY = section ? (targets[section] ?? 0) : 0;
  useEffect(() => {
    if (!targetY) return;
    // 탭이 나타나며 iOS 가 큰 제목 위치로 스크롤을 되돌린 뒤에 내려가도록 조금 늦춘다
    // iOS 탭 화면: 큰 제목이 접힌 내비게이션 막대(약 112pt) 아래에 섹션 제목이 보이도록 그만큼 덜 내려간다 (시뮬레이터에서 맞춘 값)
    const id = setTimeout(() => ref.current?.scrollTo({ y: Math.max(0, targetY - 8 - (Platform.OS === 'ios' ? 112 : 0)), animated: true }), 450);
    return () => clearTimeout(id);
  }, [targetY, ref]);
  return (
    <ScrollView
      ref={ref}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      indicatorStyle={t.scheme === 'dark' ? 'white' : 'black'}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.screenContent}>
      <View style={styles.inner}>
        {ready ? (
          <ScrollTargetContext value={report}>
            <StorageBanner />
            {children}
          </ScrollTargetContext>
        ) : (
          <ActivityIndicator style={{ marginTop: 48 }} color={t.c.sub} />
        )}
      </View>
    </ScrollView>
  );
}

/** Screen 의 바로 아래 자식으로 둔다 (위치는 화면 본문 기준으로 잰다) */
export function ScrollTarget({ name, children }: { name: string; children: ReactNode }) {
  const report = useContext(ScrollTargetContext);
  return <View onLayout={(e) => report?.(name, e.nativeEvent.layout.y)}>{children}</View>;
}

const useStyles = themed((t) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.c.bg },
    screenContent: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: 110 }, // 떠 있는 탭 바 아래로 마지막 줄이 숨지 않게
    inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: SPACE.xl },
  }),
);
