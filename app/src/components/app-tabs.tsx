// iOS·Android: 네이티브 탭 바 (UITabBarController)
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { MISSION_OPEN, missionProgress } from '@/domain';
import { useCurrent } from '@/lib/store';
import { C } from '@/lib/theme';

export default function AppTabs() {
  const { current } = useCurrent();
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
    <NativeTabs tintColor={C.ink} minimizeBehavior="never">
      <NativeTabs.Trigger name="(pack)">
        <NativeTabs.Trigger.Icon sf={{ default: 'laptopcomputer', selected: 'laptopcomputer' }} />
        <NativeTabs.Trigger.Label>비교팩</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my">
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar.badge.clock', selected: 'calendar.badge.clock' }} />
        <NativeTabs.Trigger.Label>내 체험</NativeTabs.Trigger.Label>
        {needsPayment ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="missions">
        <NativeTabs.Trigger.Icon sf={{ default: 'gift', selected: 'gift.fill' }} />
        <NativeTabs.Trigger.Label>미션</NativeTabs.Trigger.Label>
        {rewardReady ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="decide">
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.seal', selected: 'checkmark.seal.fill' }} />
        <NativeTabs.Trigger.Label>결정·반납</NativeTabs.Trigger.Label>
        {needsDecision ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
