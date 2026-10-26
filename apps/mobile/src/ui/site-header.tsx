import { Link, usePathname, type Href } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession, type MeUser } from '../auth/session';
import { t } from './i18n';
import { useAppPreferences } from './preferences';
import type { ThemePreference } from './preferences-model';
import { colors, space, themeStyles } from './theme';

interface NavItem {
  href: Href;
  label: string;
}

export function navItems(user: MeUser | null): NavItem[] {
  const items: NavItem[] = [
    { href: '/games', label: t('Game') },
    { href: '/map', label: t('Bản đồ') },
    { href: '/events', label: t('Kèo') },
    { href: '/suggest', label: t('Hôm nay chơi gì?') },
  ];
  if (!user) return items;
  items.push(
    { href: '/clubs', label: t('Club') },
    { href: '/friends', label: t('Bạn bè') },
    { href: '/shelf', label: t('Tủ game') },
    { href: '/wishlist', label: t('Muốn chơi') },
  );
  if (user.cafeMembershipCount > 0)
    items.push({ href: '/my-cafes', label: t('Địa điểm chơi của tôi') });
  if (user.role !== 'user') {
    items.push(
      { href: '/admin/games', label: t('Quản lý game') },
      { href: '/admin/cafes', label: t('Quản lý địa điểm chơi') },
      { href: '/admin/scan', label: t('Quét mã') },
      { href: '/admin/categories', label: t('Thể loại') },
      { href: '/admin/events', label: t('Quản lý Kèo') },
      { href: '/admin/clubs', label: t('Quản lý club') },
    );
  }
  if (user.role === 'admin')
    items.push({ href: '/admin/contributions', label: t('Đóng góp cộng đồng') });
  return items;
}

const WIDE = 900;
const LIGHT_LOGO = require('../../assets/brand/logo-horizontal.png');
const DARK_LOGO = require('../../assets/brand/logo-horizontal-dark.png');

export function SiteHeader() {
  const { theme } = useAppPreferences();
  const { user, loading, signOut } = useSession();
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);
  const wide = width >= WIDE;
  const items = navItems(user);

  const isActive = (href: Href) => {
    const h = String(href);
    return pathname === h || pathname.startsWith(`${h}/`);
  };
  const links = items.map((item) => {
    const active = isActive(item.href);
    return (
      <Link
        key={String(item.href)}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onPress={() => setOpen(false)}
        style={[styles.link, active && styles.linkActive]}
      >
        {item.label}
      </Link>
    );
  });
  const account = loading ? null : user ? (
    <View style={styles.account}>
      <Link href="/account" style={styles.accountName} onPress={() => setOpen(false)}>
        {user.name}
      </Link>
      <Text style={styles.role}>
        {user.role === 'user'
          ? t('Thành viên')
          : user.role === 'admin'
            ? t('Admin')
            : t('Maintainer')}
      </Text>
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text style={styles.link}>{t('Đăng xuất')}</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.account}>
      <Link href="/login" style={styles.link} onPress={() => setOpen(false)}>
        {t('Đăng nhập')}
      </Link>
      <Link href="/signup" style={styles.link} onPress={() => setOpen(false)}>
        {t('Đăng ký')}
      </Link>
    </View>
  );

  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        <Link href="/" accessibilityLabel={t('Onboard - trang chủ')} onPress={() => setOpen(false)}>
          <Image
            source={theme === 'dark' ? DARK_LOGO : LIGHT_LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        </Link>
        {wide ? <View style={styles.links}>{links}</View> : null}
        {wide ? account : null}
        <View style={styles.headerActions}>
          <LanguageButton />
          <MenuButton open={open} setOpen={setOpen} />
        </View>
      </View>
      <MenuModal
        open={open}
        onClose={() => setOpen(false)}
        maxHeight={Math.max(240, height - 72)}
        links={!wide ? links : []}
        account={!wide ? account : null}
      />
    </View>
  );
}

/** Compact menu button for the native Stack header; Stack retains its back button. */
export function SiteHeaderMenu() {
  useAppPreferences();
  const { height } = useWindowDimensions();
  const pathname = usePathname();
  const { user, loading, signOut } = useSession();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);
  const items = navItems(user);
  const links = items.map((item) => (
    <Link
      key={String(item.href)}
      href={item.href}
      style={styles.menuLink}
      onPress={() => setOpen(false)}
    >
      {item.label}
    </Link>
  ));
  const account = loading ? null : user ? (
    <View style={styles.menuAccount}>
      <Link href="/account" style={styles.accountName} onPress={() => setOpen(false)}>
        {user.name}
      </Link>
      <Text style={styles.role}>
        {user.role === 'user'
          ? t('Thành viên')
          : user.role === 'admin'
            ? t('Admin')
            : t('Maintainer')}
      </Text>
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text style={styles.menuLink}>{t('Đăng xuất')}</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.menuAccount}>
      <Link href="/login" style={styles.menuLink} onPress={() => setOpen(false)}>
        {t('Đăng nhập')}
      </Link>
      <Link href="/signup" style={styles.menuLink} onPress={() => setOpen(false)}>
        {t('Đăng ký')}
      </Link>
    </View>
  );

  return (
    <>
      <View style={styles.headerActions}>
        <LanguageButton />
        <MenuButton open={open} setOpen={setOpen} />
      </View>
      <MenuModal
        open={open}
        onClose={() => setOpen(false)}
        maxHeight={Math.max(240, height - 32)}
        links={links}
        account={account}
      />
    </>
  );
}

function LanguageButton() {
  const { language, setLanguage } = useAppPreferences();
  const label = language === 'vi' ? t('Đổi sang tiếng Anh') : t('Đổi sang tiếng Việt');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('Đổi ngôn ngữ ngay, giữ nguyên dữ liệu đang nhập')}
      onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
      style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}
    >
      <Text style={styles.languageText}>{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</Text>
    </Pressable>
  );
}

function MenuButton({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  useAppPreferences();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? t('Đóng menu') : t('Mở menu')}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={styles.menuButton}
    >
      <MenuIcon open={open} />
    </Pressable>
  );
}

function MenuModal({
  open,
  onClose,
  maxHeight,
  links,
  account,
}: {
  open: boolean;
  onClose: () => void;
  maxHeight: number;
  links: React.ReactNode[];
  account: React.ReactNode;
}) {
  useAppPreferences();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={t('Đóng menu')}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={[styles.menuFrame, { maxHeight }]}>
          <ScrollView
            contentContainerStyle={styles.menuContent}
            keyboardShouldPersistTaps="handled"
          >
            {links}
            {account ? (
              <>
                <View style={styles.divider} />
                {account}
              </>
            ) : null}
            <View style={styles.divider} />
            <Text style={styles.groupLabel}>{t('Thông tin & giấy phép')}</Text>
            <Link
              href="https://github.com/onboard-vn/onboardvn"
              style={styles.menuLink}
              onPress={onClose}
            >
              {t('Mã nguồn')}
            </Link>
            <Link
              href="https://github.com/onboard-vn/onboardvn/blob/main/LICENSE"
              style={styles.menuLink}
              onPress={onClose}
            >
              {t('Giấy phép mã nguồn AGPL-3.0-only')}
            </Link>
            <Link href="/data-sources" style={styles.menuLink} onPress={onClose}>
              {t('Giấy phép dữ liệu')} · {t('Dữ liệu CC BY-SA 4.0')}
            </Link>
            <Link href="/credits" style={styles.menuLink} onPress={onClose}>
              {t('Nguồn tham khảo')}
            </Link>
            <Link href="/data-sources" style={styles.menuLink} onPress={onClose}>
              {t('Nguồn dữ liệu & yêu cầu sửa/gỡ')}
            </Link>
          </ScrollView>
          <ThemeControls />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ThemeControls() {
  const { themePreference, setTheme } = useAppPreferences();
  const choices: { mode: ThemePreference; label: string }[] = [
    { mode: 'system', label: t('Theo thiết bị') },
    { mode: 'light', label: t('Sáng') },
    { mode: 'dark', label: t('Tối') },
  ];
  return (
    <View style={styles.themeFooter}>
      <Text style={styles.groupLabel}>{t('Giao diện')}</Text>
      <View style={styles.choices}>
        {choices.map(({ mode, label }) => {
          const selected = themePreference === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`${t('Giao diện')}: ${label}`}
              accessibilityState={{ selected }}
              onPress={() => setTheme(mode)}
              style={({ pressed }) => [
                styles.choice,
                selected && styles.choiceSelected,
                pressed && styles.pressed,
              ]}
            >
              <ThemeIcon mode={mode} selected={selected} />
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ThemeIcon({ mode, selected }: { mode: ThemePreference; selected: boolean }) {
  const ink = selected ? colors.primary : colors.text;
  const background = selected ? colors.primarySoft : colors.bg;
  return (
    <View style={styles.themeIcon} accessibilityElementsHidden importantForAccessibility="no">
      {mode === 'system' ? (
        <>
          <View style={[styles.monitorScreen, { borderColor: ink }]} />
          <View style={[styles.monitorStem, { backgroundColor: ink }]} />
          <View style={[styles.monitorBase, { backgroundColor: ink }]} />
        </>
      ) : mode === 'light' ? (
        <>
          <View style={[styles.sunCenter, { borderColor: ink }]} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation) => (
            <View
              key={rotation}
              style={[
                styles.sunRay,
                {
                  backgroundColor: ink,
                  transform: [{ rotate: `${rotation}deg` }, { translateY: -10 }],
                },
              ]}
            />
          ))}
        </>
      ) : (
        <>
          <View style={[styles.moon, { borderColor: ink }]} />
          <View style={[styles.moonCutout, { backgroundColor: background }]} />
        </>
      )}
    </View>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  useAppPreferences();
  return (
    <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.bar, open && { transform: [{ translateY: 7 }, { rotate: '45deg' }] }]} />
      <View style={[styles.bar, open && { opacity: 0 }]} />
      <View
        style={[styles.bar, open && { transform: [{ translateY: -7 }, { rotate: '-45deg' }] }]}
      />
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    header: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 2,
    },
    inner: {
      width: '100%',
      maxWidth: 1024,
      alignSelf: 'center',
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.lg,
      minHeight: 56,
    },
    logo: { width: 109, height: 36 },
    links: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: 4 },
    link: { fontSize: 15, fontWeight: '500', color: colors.text, paddingVertical: 4 },
    linkActive: {
      color: colors.primary,
      fontWeight: '700',
      borderBottomWidth: 2,
      borderBottomColor: colors.accent,
    },
    account: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
    accountName: { fontSize: 14, color: colors.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 0 },
    languageButton: {
      minHeight: 48,
      minWidth: 64,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    languageText: { fontSize: 15, fontWeight: '700', color: colors.text },
    pressed: { opacity: 0.65 },
    role: {
      fontSize: 12,
      backgroundColor: colors.bg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      color: colors.text,
    },
    menuButton: {
      padding: space.sm,
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { width: 22, height: 16, justifyContent: 'space-between' },
    bar: { height: 2, borderRadius: 1, backgroundColor: colors.text },
    modalRoot: {
      flex: 1,
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      backgroundColor: 'rgba(0,0,0,0.28)',
    },
    menuFrame: {
      flexShrink: 1,
      width: 380,
      maxWidth: '100%',
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      overflow: 'hidden',
    },
    menuContent: {
      paddingHorizontal: space.lg,
      paddingBottom: space.lg,
      paddingTop: space.md,
      gap: space.sm,
    },
    menuLink: { paddingVertical: 10, fontSize: 15, color: colors.text },
    menuAccount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      flexWrap: 'wrap',
      paddingTop: space.sm,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },
    themeFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: space.md,
      gap: space.sm,
    },
    groupLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    choice: {
      flex: 1,
      minHeight: 64,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm,
      backgroundColor: colors.bg,
    },
    choiceSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    choiceText: { fontSize: 14, fontWeight: '600', color: colors.text },
    choiceTextSelected: { color: colors.primary },
    themeIcon: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    monitorScreen: {
      width: 22,
      height: 15,
      borderWidth: 2,
      borderRadius: 3,
      position: 'absolute',
      top: 1,
    },
    monitorStem: { width: 2, height: 5, position: 'absolute', top: 16 },
    monitorBase: { width: 12, height: 2, position: 'absolute', bottom: 1, borderRadius: 1 },
    sunCenter: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
    sunRay: { width: 2, height: 4, borderRadius: 1, position: 'absolute' },
    moon: { width: 21, height: 21, borderRadius: 11, borderWidth: 2 },
    moonCutout: {
      width: 18,
      height: 18,
      borderRadius: 9,
      position: 'absolute',
      right: -3,
      top: -2,
    },
  }),
);
