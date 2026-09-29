// iOS·Android: 네이티브 탭 바 (UITabBarController)
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { MISSION_OPEN, missionProgress } from '@/domain';
import { useCurrent } from '@/lib/store';
import { useTheme } from '@/lib/theme-context';

export default function AppTabs() {
  const { current } = useCurrent();
  const t = useTheme();
  const needsPayment = current?.status === 'payment_pending';
  const needsDecision = current?.status === 'in_trial' && !current.decision;
  // 핵심 미션과 코드를 다 채웠는데 아직 리워드를 신청하지 않았을 때만 점을 찍는다
  const rewardReady =
    !!current &&
    MISSION_OPEN.includes(current.status) &&
    current.reward.status === 'none' &&
    !!current.codeCheck &&
    missionProgress(current).missing.length === 0;
  return (
    // 탭 바 유리 재질은 앱 창의 라이트/다크(theme-context 의 Appearance 설정)를 따른다. 탭 화면 바탕도 테마 색으로 칠해
    // 탭을 바꿀 때 흰 바탕이 비치지 않게 한다.
    <NativeTabs tintColor={t.c.ink} badgeBackgroundColor={t.c.coral} minimizeBehavior="never">
      <NativeTabs.Trigger name="(pack)" contentStyle={{ backgroundColor: t.c.bg }}>
        <NativeTabs.Trigger.Icon sf={{ default: 'laptopcomputer', selected: 'laptopcomputer' }} />
        <NativeTabs.Trigger.Label>비교팩</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my" contentStyle={{ backgroundColor: t.c.bg }}>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar.badge.clock', selected: 'calendar.badge.clock' }} />
        <NativeTabs.Trigger.Label>내 체험</NativeTabs.Trigger.Label>
        {needsPayment ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="missions" contentStyle={{ backgroundColor: t.c.bg }}>
        <NativeTabs.Trigger.Icon sf={{ default: 'gift', selected: 'gift.fill' }} />
        <NativeTabs.Trigger.Label>미션</NativeTabs.Trigger.Label>
        {rewardReady ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="decide" contentStyle={{ backgroundColor: t.c.bg }}>
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.seal', selected: 'checkmark.seal.fill' }} />
        <NativeTabs.Trigger.Label>결정·반납</NativeTabs.Trigger.Label>
        {needsDecision ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
