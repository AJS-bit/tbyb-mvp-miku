// iOS·Android: 네이티브 탭 바 (UITabBarController)
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useCurrent } from '@/lib/store';
import { C } from '@/lib/theme';

export default function AppTabs() {
  const { current } = useCurrent();
  const needsPayment = current?.status === 'payment_pending';
  const needsDecision = current?.status === 'in_trial' && !current.decision;
  return (
    <NativeTabs tintColor={C.primary} minimizeBehavior="never">
      <NativeTabs.Trigger name="(pack)">
        <NativeTabs.Trigger.Icon sf={{ default: 'laptopcomputer', selected: 'laptopcomputer' }} />
        <NativeTabs.Trigger.Label>비교팩</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my">
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar.badge.clock', selected: 'calendar.badge.clock' }} />
        <NativeTabs.Trigger.Label>내 체험</NativeTabs.Trigger.Label>
        {needsPayment ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.and.pencil', selected: 'square.and.pencil' }} />
        <NativeTabs.Trigger.Label>비교 기록</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="decide">
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.seal', selected: 'checkmark.seal.fill' }} />
        <NativeTabs.Trigger.Label>결정·반납</NativeTabs.Trigger.Label>
        {needsDecision ? <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
