import { type ReactNode, type Ref } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useApp } from '@/lib/store';
import { C, MAX_WIDTH, SPACE } from '@/lib/theme';

import { StorageBanner } from './storage-banner';

// ───────── 화면 틀 ─────────

export function Screen({ children, scrollRef }: { children: ReactNode; scrollRef?: Ref<ScrollView> }) {
  const { ready } = useApp();
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.screenContent}>
      <View style={styles.inner}>
        {ready ? (
          <>
            <StorageBanner />
            {children}
          </>
        ) : (
          <ActivityIndicator style={{ marginTop: 48 }} color={C.sub} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  screenContent: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: 110 }, // 떠 있는 탭 바 아래로 마지막 줄이 숨지 않게
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: SPACE.xl },
});
