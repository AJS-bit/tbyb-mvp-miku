import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ColorValue,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { DEVICE_LABEL, STATUS_LABEL, type DeviceKey, type ReservationStatus } from '@/domain';
import { haptic } from '@/lib/haptics';
import { FONT_FAMILY, RADIUS, SPACE } from '@/lib/theme';
import { themed, useTheme } from '@/lib/theme-context';

// ───────── 텍스트 (한국어 줄바꿈: 단어 단위 · 본문 행간 넉넉히) ─────────

const makeVariants = (ink: string, sub: string) =>
  StyleSheet.create({
    display: { fontSize: 29, lineHeight: 38, fontWeight: '800', color: ink, letterSpacing: -0.6 },
    title: { fontSize: 23, lineHeight: 31, fontWeight: '800', color: ink, letterSpacing: -0.45 },
    title3: { fontSize: 19, lineHeight: 27, fontWeight: '700', color: ink, letterSpacing: -0.35 },
    headline: { fontSize: 16, lineHeight: 24, fontWeight: '700', color: ink, letterSpacing: -0.2 },
    body: { fontSize: 16, lineHeight: 27, color: ink },
    callout: { fontSize: 15, lineHeight: 24, color: ink },
    footnote: { fontSize: 13, lineHeight: 20, color: sub },
    caption: { fontSize: 12, lineHeight: 17, color: sub },
    eyebrow: { fontSize: 11, lineHeight: 15, fontWeight: '700', color: sub, letterSpacing: 1.8 },
  });
const useVariants = themed((t) => makeVariants(t.c.ink, t.c.sub));

export type TextVariant = keyof ReturnType<typeof makeVariants>;

export function T({
  variant = 'body',
  style,
  color,
  weight,
  ...props
}: TextProps & { variant?: TextVariant; color?: string; weight?: TextStyle['fontWeight'] }) {
  const variants = useVariants();
  return (
    <Text
      lineBreakStrategyIOS="hangul-word"
      {...props}
      style={[
        variants[variant],
        FONT_FAMILY ? { fontFamily: FONT_FAMILY } : null,
        color ? { color } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}

/** 작은 영문 대문자 머리글 (예: TRY BEFORE YOU BUY · 01) */
export function Eyebrow({ children, color, style }: { children: string; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <T variant="eyebrow" color={color} style={style} accessibilityElementsHidden importantForAccessibility="no">
      {children.toUpperCase()}
    </T>
  );
}

// ───────── 아이콘 (iOS: SF Symbols · 웹: Material Symbols) ─────────

type NameObj = Exclude<SymbolViewProps['name'], string>;
export type IconPair = [NonNullable<NameObj['ios']>, NonNullable<NameObj['web']>];
export function Icon({
  ios,
  web,
  size = 18,
  color,
  style,
}: {
  ios: NonNullable<NameObj['ios']>;
  web: NonNullable<NameObj['web']>;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const symbol = (
    <SymbolView
      name={{ ios, web, android: web }}
      size={size}
      tintColor={color ?? c.ink}
      style={Platform.OS === 'web' ? undefined : style}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
  // 웹에서는 아이콘 글리프가 버튼 이름에 섞여 읽히지 않게 감싸서 숨긴다
  if (Platform.OS !== 'web') return symbol;
  return (
    <View aria-hidden style={style}>
      {symbol}
    </View>
  );
}

// ───────── 은은한 페이드업 (시스템 '동작 줄이기'를 따른다) ─────────

export function FadeUp({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(delay).reduceMotion(ReduceMotion.System)} style={style}>
      {children}
    </Animated.View>
  );
}

// ───────── 틀 ─────────

export function Card({
  children,
  style,
  accent,
  tint,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
  tint?: string;
}) {
  const s = useStyles();
  return (
    <View style={[s.card, accent ? { borderColor: accent, borderWidth: 1.5 } : null, tint ? { backgroundColor: tint } : null, style]}>
      {children}
    </View>
  );
}

export function Section({
  title,
  eyebrow,
  caption,
  right,
  children,
  style,
}: {
  title: string;
  eyebrow?: string;
  caption?: string;
  right?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  return (
    <View style={[s.section, style]}>
      <View style={s.sectionHead}>
        <View style={{ flex: 1, gap: 3 }}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <T variant="title3" accessibilityRole="header">
            {title}
          </T>
          {caption ? <T variant="footnote">{caption}</T> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style, gap = SPACE.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.lineStrong }, style]} />;
}

// ───────── 알림 상자 ─────────

type Tone = 'warn' | 'info' | 'error' | 'done' | 'coral';
const useTones = themed(({ c }): Record<Tone, { bg: string; fg: string; border: string; icon: IconPair }> => ({
  warn: { bg: c.warnBg, fg: c.warnText, border: c.warnLine, icon: ['exclamationmark.circle', 'error'] },
  info: { bg: c.greySoft, fg: c.sub, border: c.greySoft, icon: ['info.circle', 'info'] },
  error: { bg: c.errorSoft, fg: c.error, border: c.errorLine, icon: ['exclamationmark.triangle', 'warning'] },
  done: { bg: c.doneSoft, fg: c.doneText, border: c.doneLine, icon: ['checkmark.circle', 'check_circle'] },
  coral: { bg: c.coralSoft, fg: c.coralInk, border: c.coralLine, icon: ['gift', 'redeem'] },
}));

export function Notice({
  tone = 'warn',
  title,
  children,
  style,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  const t = useTones()[tone];
  return (
    <View style={[s.notice, { backgroundColor: t.bg, borderColor: t.border }, style]} accessibilityRole="summary">
      <Icon ios={t.icon[0]} web={t.icon[1]} size={17} color={t.fg} style={{ marginTop: 3 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <T variant="callout" weight="700" color={t.fg}>
            {title}
          </T>
        ) : null}
        {typeof children === 'string' ? (
          <T variant="callout" color={t.fg}>
            {children}
          </T>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** 도메인 함수가 ok:false 로 돌려준 오류를 동작 옆에 바로 보여 준다 */
export function ErrorText({ message, style }: { message?: string | null; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  const { c } = useTheme();
  if (!message) return null;
  return (
    <View style={[s.error, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon ios="exclamationmark.circle.fill" web="error" size={16} color={c.error} style={{ marginTop: 3 }} />
      <T variant="callout" color={c.error} style={{ flex: 1 }}>
        {message}
      </T>
    </View>
  );
}

// ───────── 버튼 (주 버튼 = 잉크 위 아이보리 글자) ─────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'coral';
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  small,
  accessibilityHint,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: IconPair;
  small?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** 기본값 button-<variant> — 웹 빌드 검증(verify-app-storage)이 화면의 주 버튼 수를 센다 */
  testID?: string;
}) {
  const s = useStyles();
  const buttons = useButtons();
  const v = buttons[variant];
  // 비활성: 라이트는 흐리게(투명도), 다크는 흐리면 탁한 갈색이 돼서 한 톤 낮은 칸 + 흐린 글자로 바꾼다
  const off = disabled ? buttons.disabled : null;
  const fg = off ? off.fg : v.fg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={!!disabled}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      testID={testID ?? `button-${variant}`}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        disabled && (off ? { backgroundColor: off.bg, borderColor: off.border } : { opacity: 0.38 }),
        pressed && !disabled && { opacity: 0.8, transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {icon ? <Icon ios={icon[0]} web={icon[1]} size={small ? 15 : 17} color={fg} /> : null}
      <T variant={small ? 'callout' : 'headline'} weight="700" color={fg} style={{ textAlign: 'center', flexShrink: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}

// 다크에서는 잉크 버튼이 뒤집힌다 (밝은 잉크 바탕 + 어두운 글자)
type ButtonTone = { bg: string; fg: string; border: string };
const useButtons = themed(({ c, scheme }): Record<ButtonVariant, ButtonTone> & { disabled: ButtonTone | null } => ({
  primary: { bg: c.ink, fg: c.ivory, border: c.ink },
  secondary: { bg: c.surface, fg: c.ink, border: c.lineStrong },
  danger: { bg: c.errorSoft, fg: c.error, border: c.errorLine },
  ghost: { bg: 'transparent', fg: c.ink, border: 'transparent' }, // 투명 — 테마와 무관
  coral: { bg: c.coral, fg: c.onCoral, border: c.coral },
  disabled: scheme === 'dark' ? { bg: c.sunk, fg: c.muted, border: c.line } : null,
}));

// ───────── 칩 ─────────

export function StatusChip({ status, large }: { status: ReservationStatus; large?: boolean }) {
  const s = useStyles();
  const t = useTheme().status[status];
  return (
    <View
      style={[s.chip, { backgroundColor: t.bg }, large && { paddingVertical: 6, paddingHorizontal: 13 }]}
      accessibilityLabel={`상태: ${STATUS_LABEL[status]}`}>
      <View style={[s.chipDot, { backgroundColor: t.dot }]} />
      <T variant={large ? 'callout' : 'footnote'} weight="700" color={t.fg}>
        {STATUS_LABEL[status]}
      </T>
    </View>
  );
}

export function DeviceTag({ kind, full, style }: { kind: DeviceKey; full?: boolean; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  const t = useTheme();
  const d = t.device[kind];
  return (
    <View style={[s.chip, { backgroundColor: d.soft }, style]}>
      <View style={[s.chipDot, { backgroundColor: d.main }]} />
      <T variant="footnote" weight="700" color={t.c.ink}>
        {full ? DEVICE_LABEL[kind] : d.short}
      </T>
    </View>
  );
}

export function Pill({ label, bg, fg, style }: { label: string; bg?: string; fg?: string; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <View style={[s.chip, { backgroundColor: bg ?? c.greySoft }, style]}>
      <T variant="caption" weight="700" color={fg ?? c.sub}>
        {label}
      </T>
    </View>
  );
}

/** 고르는 칩 (후속 선택지·용도·빠른 이유) — 고르면 잉크 */
export function ChoiceChip({
  label,
  selected,
  onPress,
  role = 'radio',
  disabled,
  a11y,
  small,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  role?: 'radio' | 'checkbox' | 'button';
  disabled?: boolean;
  a11y?: string;
  small?: boolean;
}) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      aria-checked={role === 'button' ? undefined : selected}
      aria-selected={role === 'radio' ? selected : undefined}
      aria-disabled={!!disabled}
      accessibilityLabel={a11y ?? label}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [s.choice, small && s.choiceSmall, selected && s.choiceOn, disabled && { opacity: 0.45 }, pressed && { opacity: 0.75 }]}>
      {selected && role !== 'button' ? <Icon ios="checkmark" web="check" size={12} color={c.ivory} /> : null}
      <T variant={small ? 'footnote' : 'callout'} weight={selected ? '700' : '500'} color={selected ? c.ivory : c.ink}>
        {label}
      </T>
    </Pressable>
  );
}

// ───────── 선택 컨트롤 ─────────

export interface SegOption<V> {
  value: V;
  label: string;
  color?: string; // 선택 시 채움색 (Air/Pro/잉크)
  fg?: string; // 채움색 위 글자색 (color 와 함께 준다 — 테마의 onAir·onPro·ivory)
  disabled?: boolean;
  a11y?: string;
}

export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  allowDeselect,
  compact,
  accessibilityLabel,
}: {
  options: SegOption<V>[];
  value: V | null;
  onChange: (v: V | null) => void;
  allowDeselect?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <View style={[s.segTrack, compact && { padding: 3 }]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        const fill = o.color ?? c.surface;
        return (
          <Pressable
            key={String(o.value)}
            disabled={o.disabled}
            accessibilityRole="radio"
            aria-checked={selected}
            aria-selected={selected}
            aria-disabled={!!o.disabled}
            accessibilityLabel={o.a11y ?? o.label}
            onPress={() => {
              haptic.select();
              onChange(selected && allowDeselect ? null : o.value);
            }}
            style={({ pressed }) => [
              s.seg,
              compact && s.segCompact,
              selected && { backgroundColor: fill },
              selected && !o.color && s.segRaised,
              o.disabled && { opacity: 0.35 },
              pressed && { opacity: 0.7 },
            ]}>
            <T
              variant="callout"
              weight={selected ? '800' : '500'}
              color={selected ? (o.color ? (o.fg ?? c.ivory) : c.ink) : c.sub}
              numberOfLines={1}
              style={{ textAlign: 'center' }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScorePicker({
  label,
  value,
  onChange,
  color,
  a11yPrefix,
}: {
  label?: string;
  value: number | null;
  onChange: (v: 1 | 2 | 3 | 4 | 5 | null) => void;
  color?: string;
  a11yPrefix?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <T variant="footnote" weight="600" color={c.sub}>
          {label}
        </T>
      ) : null}
      <Segmented<1 | 2 | 3 | 4 | 5>
        compact
        allowDeselect
        accessibilityLabel={`${a11yPrefix ?? ''}${label ?? ''} 1–5점`}
        value={value as 1 | 2 | 3 | 4 | 5 | null}
        onChange={onChange}
        options={([1, 2, 3, 4, 5] as const).map((n) => ({
          value: n,
          label: String(n),
          color: color ?? c.ink,
          fg: c.ivory,
          a11y: `${a11yPrefix ?? ''}${label ?? ''} ${n}점`,
        }))}
      />
    </View>
  );
}

export function CheckRow({
  checked,
  label,
  onToggle,
  color,
  sub,
  disabled,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  color?: string; // 체크했을 때 채움색 (기본 잉크)
  sub?: string;
  disabled?: boolean;
}) {
  const s = useStyles();
  const { c } = useTheme();
  const fill = color ?? c.ink;
  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={checked}
      aria-disabled={!!disabled}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onToggle();
      }}
      style={({ pressed }) => [s.checkRow, pressed && { opacity: 0.7 }, disabled && { opacity: 0.5 }]}>
      <View style={[s.checkBox, checked && { backgroundColor: fill, borderColor: fill }]}>
        {checked ? <Icon ios="checkmark" web="check" size={14} color={color ? c.onMark : c.ivory} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="callout" color={checked ? c.sub : c.ink} style={checked ? { textDecorationLine: 'line-through' } : null}>
          {label}
        </T>
        {sub ? <T variant="caption">{sub}</T> : null}
      </View>
    </Pressable>
  );
}

export function RadioRow({
  selected,
  label,
  sub,
  onPress,
  disabled,
  color,
  children,
}: {
  selected: boolean;
  label: string;
  sub?: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  children?: ReactNode;
}) {
  const s = useStyles();
  const { c } = useTheme();
  const ring = color ?? c.ink;
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      aria-selected={selected}
      aria-disabled={!!disabled}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        s.radioRow,
        selected && { borderColor: ring, backgroundColor: c.surface },
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
      ]}>
      <View style={[s.radioOuter, selected && { borderColor: ring }]}>{selected ? <View style={[s.radioInner, { backgroundColor: ring }]} /> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="callout" weight={selected ? '700' : '500'}>
          {label}
        </T>
        {sub ? <T variant="footnote">{sub}</T> : null}
        {children}
      </View>
    </Pressable>
  );
}

export function SwitchRow({
  label,
  sub,
  value,
  onValueChange,
  disabled,
  color,
  onColor,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  color?: string; // 켰을 때 트랙 색 (기본 잉크)
  onColor?: string; // 다크에서 켰을 때 손잡이 색 (밝은 트랙 위에서 보이게) — 기본 ivory
}) {
  const s = useStyles();
  const t = useTheme();
  const { c } = t;
  // 라이트는 흰 손잡이 그대로, 다크는 밝은 트랙 위에서 손잡이를 어둡게 뒤집는다
  const thumb = t.scheme === 'dark' && value ? (onColor ?? c.ivory) : c.thumb;
  return (
    <View style={[s.switchRow, disabled && { opacity: 0.5 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="callout">{label}</T>
        {sub ? <T variant="caption">{sub}</T> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          haptic.select();
          onValueChange(v);
        }}
        trackColor={{ true: color ?? c.ink, false: c.switchOff }}
        ios_backgroundColor={c.switchOff}
        thumbColor={thumb}
        {...(Platform.OS === 'web' ? { activeThumbColor: thumb } : null)}
      />
    </View>
  );
}

export function Field({
  label,
  hint,
  children,
  optional,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Row gap={6}>
          <T variant="headline" accessibilityLabel={required ? `${label}, 필수` : optional ? `${label}, 선택` : label}>
            {label}
          </T>
          {optional ? <Pill label="선택" /> : null}
          {required ? <Pill label="필수" bg={c.coralSoft} fg={c.coralInk} /> : null}
        </Row>
        {hint ? <T variant="footnote">{hint}</T> : null}
      </View>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const s = useStyles();
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.c.placeholder}
      keyboardAppearance={t.scheme}
      selectionColor={t.c.coral}
      {...props}
      style={[s.input, props.multiline && s.inputMulti, FONT_FAMILY ? { fontFamily: FONT_FAMILY } : null, props.style]}
    />
  );
}

export function KeyValue({ k, v, children }: { k: string; v?: string; children?: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.kv}>
      <T variant="footnote" style={{ width: 92 }}>
        {k}
      </T>
      <View style={{ flex: 1 }}>{children ?? <T variant="callout">{v}</T>}</View>
    </View>
  );
}

// ───────── 스타일 ─────────

const useStyles = themed(({ c, shadow, raised }) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: RADIUS.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      padding: 18,
      gap: SPACE.md,
      ...shadow,
    },
    section: { gap: SPACE.md },
    sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm, paddingHorizontal: 2 },
    notice: {
      flexDirection: 'row',
      gap: 10,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
    },
    error: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.errorSoft,
    },
    button: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: SPACE.lg,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonSmall: { minHeight: 42, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 13 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingVertical: 3,
      paddingHorizontal: 10,
      borderRadius: RADIUS.chip,
    },
    chipDot: { width: 7, height: 7, borderRadius: 4 },
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: RADIUS.chip,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.surface,
    },
    choiceSmall: { paddingVertical: 7, paddingHorizontal: 12 },
    choiceOn: { backgroundColor: c.ink, borderColor: c.ink },
    segTrack: {
      flexDirection: 'row',
      backgroundColor: c.sunk,
      borderRadius: RADIUS.control,
      padding: 4,
      gap: 4,
    },
    seg: {
      flex: 1,
      minHeight: 40,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    segCompact: { minHeight: 38, paddingHorizontal: 0 },
    segRaised: raised,
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
    checkBox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: c.control,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
      backgroundColor: c.surface,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 15,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: c.control,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.lineStrong,
      borderRadius: RADIUS.control,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      color: c.ink,
    },
    inputMulti: { minHeight: 88, textAlignVertical: 'top', paddingTop: 13 },
    kv: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  }),
);
