// 웹 미리보기: 하단 탭 (JS 탭)
import { Tabs } from 'expo-router/js-tabs';

import { FONT_FAMILY } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

import { Icon } from './ui';

export default function AppTabs() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.sub,
        tabBarLabelStyle: { fontFamily: FONT_FAMILY, fontSize: 12, lineHeight: 18, fontWeight: '700' },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, height: 62 },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen
        name="(pack)"
        options={{ title: '비교팩', tabBarIcon: ({ color }) => <Icon ios="laptopcomputer" web="laptop" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="my"
        options={{ title: '내 체험', tabBarIcon: ({ color }) => <Icon ios="calendar.badge.clock" web="event" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="missions"
        options={{ title: '미션', tabBarIcon: ({ color }) => <Icon ios="gift" web="redeem" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="decide"
        options={{ title: '결정·반납', tabBarIcon: ({ color }) => <Icon ios="checkmark.seal" web="verified" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
