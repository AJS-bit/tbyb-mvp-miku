// 저장소 오류를 숨기지 않는다: 읽기 실패(원본 보존 + 원본 보기/복사 + 명시적 초기화), 쓰기 실패(반영 안 됨 안내)
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { STORAGE_READ_ERROR, STORAGE_WRITE_ERROR } from '@/domain';
import { cancelAllReminders } from '@/lib/reminders';
import { dismissWriteError, resetAll, useApp } from '@/lib/store';
import { C, RADIUS } from '@/lib/theme';

import { Button, Icon, Row, T } from './ui';

export function StorageBanner() {
  const { loadError, writeError } = useApp();
  if (loadError) return <ReadErrorCard items={loadError} />;
  if (writeError) return <WriteErrorCard />;
  return null;
}

function ReadErrorCard({ items }: { items: { key: string; raw: string }[] }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const rawText = items.map((i) => `[${i.key}]\n${i.raw}`).join('\n\n');

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Row gap={8} style={{ alignItems: 'flex-start' }}>
        <Icon ios="exclamationmark.octagon.fill" web="report" size={18} color={C.error} style={{ marginTop: 2 }} />
        <T variant="callout" weight="700" color={C.error} style={{ flex: 1 }}>
          {STORAGE_READ_ERROR}
        </T>
      </Row>
      <T variant="footnote">복원하지 못한 동안에는 변경 사항을 저장하지 않습니다.</T>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <Button small variant="secondary" label={showRaw ? '원본 숨기기' : '원본 보기'} onPress={() => setShowRaw((v) => !v)} />
        <Button
          small
          variant="secondary"
          label="원본 복사"
          onPress={async () => {
            try {
              await Clipboard.setStringAsync(rawText);
              setCopied('원본을 클립보드에 복사했습니다.');
            } catch {
              setShowRaw(true);
              setCopied('복사하지 못했습니다. 아래 원본을 길게 눌러 직접 선택해 주세요.');
            }
          }}
        />
        <Button small variant="danger" label="초기화" onPress={() => setConfirming(true)} />
      </Row>
      {copied ? <T variant="footnote">{copied}</T> : null}
      {showRaw ? (
        <ScrollView style={styles.raw} nestedScrollEnabled>
          <Text selectable style={styles.rawText}>
            {rawText || '(비어 있음)'}
          </Text>
        </ScrollView>
      ) : null}
      {confirming ? (
        <View style={{ gap: 8 }}>
          <T variant="callout" weight="700">
            원본을 지우고 초기 상태로 시작할까요? 되돌릴 수 없습니다.
          </T>
          <Row gap={8}>
            <Button
              small
              variant="danger"
              label="원본 지우고 초기화"
              onPress={async () => {
                await cancelAllReminders();
                const ok = await resetAll();
                if (!ok) setResetError(STORAGE_WRITE_ERROR);
                setConfirming(false);
              }}
              style={{ flex: 1 }}
            />
            <Button small variant="secondary" label="취소" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
          </Row>
        </View>
      ) : null}
      {resetError ? <T variant="footnote" color={C.error}>{resetError}</T> : null}
    </View>
  );
}

function WriteErrorCard() {
  return (
    <View style={styles.card} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Row gap={8} style={{ alignItems: 'flex-start' }}>
        <Icon ios="exclamationmark.triangle.fill" web="warning" size={18} color={C.error} style={{ marginTop: 2 }} />
        <T variant="callout" weight="700" color={C.error} style={{ flex: 1 }}>
          {STORAGE_WRITE_ERROR}
        </T>
      </Row>
      <T variant="footnote">
        저장하지 못한 변경은 화면에도 반영하지 않았습니다. 입력한 내용은 그대로 있으니 저장 공간을 확인한 뒤 다시 시도해 주세요.
      </T>
      <Button small variant="secondary" label="확인" onPress={dismissWriteError} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.errorSoft,
    borderColor: '#FECDCA',
    borderWidth: 1.5,
    borderRadius: RADIUS.card,
    padding: 14,
    gap: 10,
  },
  raw: { maxHeight: 200, backgroundColor: C.surface, borderRadius: 8, padding: 10 },
  rawText: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    color: C.ink,
  },
});
