import { type ReactNode, type Ref } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useApp } from '@/lib/store';
import { MAX_WIDTH, SPACE } from '@/lib/theme';
import { themed, useTheme } from '@/lib/theme-context';

import { StorageBanner } from './storage-banner';

// ───────── 화면 틀 ─────────

export function Screen({ children, scrollRef }: { children: ReactNode; scrollRef?: Ref<ScrollView> }) {
  const { ready } = useApp();
  const t = useTheme();
  const styles = useStyles();
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      indicatorStyle={t.scheme === 'dark' ? 'white' : 'black'}
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
          <ActivityIndicator style={{ marginTop: 48 }} color={t.c.sub} />
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.c.bg },
    screenContent: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: 110 }, // 떠 있는 탭 바 아래로 마지막 줄이 숨지 않게
    inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: SPACE.xl },
  }),
);
