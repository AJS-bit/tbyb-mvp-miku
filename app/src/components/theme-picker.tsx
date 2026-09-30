// 화면 모드 고르기 — 시스템(기본) · 라이트 · 다크. 내 체험 탭 맨 아래에 둔다.
// 저장은 앱 UI 상태(updateUi)로. 저장에 실패하면 이번 실행에만 적용하고, 여기와 저장소 오류 카드에서 알린다.
import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { PALETTES } from '@/lib/palette';
import { THEME_PREFS, type ThemePref } from '@/lib/theme';
import { themed, useTheme, useThemeControl } from '@/lib/theme-context';

import { Card, Icon, Notice, Row, Section, T, type IconPair } from './ui';

const OPTIONS: Record<ThemePref, { label: string; a11y: string; icon: IconPair }> = {
  system: { label: '기기 설정', a11y: '기기 설정 따라가기', icon: ['circle.lefthalf.filled', 'contrast'] },
  light: { label: '라이트', a11y: '라이트', icon: ['sun.max', 'light_mode'] },
  dark: { label: '다크', a11y: '다크', icon: ['moon', 'dark_mode'] },
};

const SCHEME_LABEL = { light: '라이트', dark: '다크' } as const;

export function ThemePicker() {
  const { pref, system, choose, sessionOnly } = useThemeControl();
  const { c } = useTheme();
  const s = useStyles();

  return (
    <Section eyebrow="Appearance" title="화면 모드" caption="밤에는 따뜻한 어두운 화면으로 볼 수 있어요. 고른 모드는 이 기기에만 저장돼요.">
      <Card style={{ gap: 14 }}>
        <View style={s.row} accessibilityRole="radiogroup" accessibilityLabel="화면 모드">
          {THEME_PREFS.map((p) => {
            const o = OPTIONS[p];
            const selected = pref === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                aria-checked={selected}
                aria-selected={selected}
                accessibilityLabel={o.a11y}
                onPress={() => {
                  if (selected) return;
                  haptic.select();
                  choose(p);
                }}
                style={({ pressed }) => [s.tile, selected && s.tileOn, pressed && { opacity: 0.8 }]}>
                <Preview pref={p} />
                <Row gap={6} style={{ justifyContent: 'center' }}>
                  <Icon ios={o.icon[0]} web={o.icon[1]} size={14} color={selected ? c.ink : c.sub} />
                  <T variant="callout" weight={selected ? '800' : '500'} color={selected ? c.ink : c.sub}>
                    {o.label}
                  </T>
                </Row>
              </Pressable>
            );
          })}
        </View>
        <T variant="footnote">
          {pref === 'system'
            ? `기기 설정을 따라가요. 지금은 ${SCHEME_LABEL[system]}예요.`
            : `기기 설정과 상관없이 늘 ${SCHEME_LABEL[pref]}로 보여요`}
        </T>
        {sessionOnly ? (
          <Notice tone="warn" title="이번 실행에만 적용됐어요">
            화면 모드를 기기에 저장하지 못했어요. 앱을 다시 열면 이전 설정으로 돌아가요.
          </Notice>
        ) : null}
      </Card>
    </Section>
  );
}

// 미리보기 칸 — 라이트/다크 팔레트를 그대로 그린다 (지금 테마와 상관없이 그 모드의 모습이라 테마 고정 색)
function Preview({ pref }: { pref: ThemePref }) {
  const s = useStyles();
  const halves: ('light' | 'dark')[] = pref === 'system' ? ['light', 'dark'] : [pref];
  return (
    <View style={s.preview}>
      {halves.map((h) => {
        const p = PALETTES[h];
        return (
          <View key={h} style={[s.half, { backgroundColor: p.bg }]}>
            <View style={[s.miniCard, { backgroundColor: p.surface, borderColor: p.line }]}>
              <View style={[s.miniLine, { backgroundColor: p.ink }]} />
              <View style={[s.miniLine, { width: '55%', backgroundColor: p.sub, opacity: 0.6 }]} />
              <View style={[s.miniDot, { backgroundColor: p.coral }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    tile: {
      flex: 1,
      gap: 9,
      padding: 8,
      paddingBottom: 10,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    tileOn: { borderColor: c.ink, borderWidth: 2, padding: 7.5, paddingBottom: 9.5 },
    preview: {
      flexDirection: 'row',
      height: 58,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.lineStrong,
    },
    half: { flex: 1, padding: 7, justifyContent: 'flex-end' },
    miniCard: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, padding: 5, gap: 3 },
    miniLine: { height: 3, width: '80%', borderRadius: 2 },
    miniDot: { position: 'absolute', right: 5, top: 5, width: 6, height: 6, borderRadius: 3 },
  }),
);
