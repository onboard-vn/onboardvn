import { Link, usePathname, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSession, type MeUser } from '../auth/session';
import { colors, space } from './theme';

const ROLE_LABEL: Record<string, string> = {
  user: 'Thành viên',
  maintainer: 'Maintainer',
  admin: 'Admin',
};

interface NavItem {
  href: Href;
  label: string;
}

export function navItems(user: MeUser | null): NavItem[] {
  const items: NavItem[] = [
    { href: '/games', label: 'Game' },
    { href: '/cafes', label: 'Địa điểm chơi' },
    { href: '/map', label: 'Bản đồ' },
    { href: '/events', label: 'Kèo' },
    { href: '/suggest', label: 'Hôm nay chơi gì?' },
  ];
  if (!user) return items;
  items.push(
    { href: '/clubs', label: 'Club' },
    { href: '/friends', label: 'Bạn bè' },
    { href: '/shelf', label: 'Tủ game' },
    { href: '/wishlist', label: 'Muốn chơi' },
  );
  if (user.cafeMembershipCount > 0)
    items.push({ href: '/my-cafes', label: 'Địa điểm chơi của tôi' });
  if (user.role !== 'user') {
    items.push(
      { href: '/admin/games', label: 'Quản lý game' },
      { href: '/admin/cafes', label: 'Quản lý địa điểm chơi' },
      { href: '/admin/scan', label: 'Quét mã' },
      { href: '/admin/categories', label: 'Thể loại' },
      { href: '/admin/events', label: 'Quản lý Kèo' },
      { href: '/admin/clubs', label: 'Quản lý club' },
    );
  }
  if (user.role === 'admin')
    items.push({ href: '/admin/contributions', label: 'Đóng góp cộng đồng' });
  return items;
}

const WIDE = 900;

export function SiteHeader() {
  const { user, loading, signOut } = useSession();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }
  const wide = width >= WIDE;
  const items = navItems(user);

  const isActive = (href: Href) => {
    const h = String(href);
    return pathname === h || pathname.startsWith(`${h}/`);
  };
  const links = items.map((i) => {
    const active = isActive(i.href);
    return (
      <Link
        key={i.label}
        href={i.href}
        aria-current={active ? 'page' : undefined}
        style={[
          styles.link,
          !wide && styles.menuLink,
          active && styles.linkActive,
          active && !wide && styles.menuLinkActive,
        ]}
      >
        {i.label}
      </Link>
    );
  });
  const account = loading ? null : user ? (
    <View style={[styles.account, !wide && styles.menuAccount]}>
      <Link href="/account" style={styles.accountName}>
        {user.name}
      </Link>
      <Text style={styles.role}>{ROLE_LABEL[user.role] ?? user.role}</Text>
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text style={styles.link}>Đăng xuất</Text>
      </Pressable>
    </View>
  ) : (
    <View style={[styles.account, !wide && styles.menuAccount]}>
      <Link href="/login" style={styles.link}>
        Đăng nhập
      </Link>
      <Link href="/signup" style={styles.link}>
        Đăng ký
      </Link>
    </View>
  );

  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        <Link href="/" accessibilityLabel="Onboard - trang chủ">
          <Image
            source={require('../../assets/brand/logo-horizontal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Link>
        {wide ? (
          <>
            <View style={styles.links}>{links}</View>
            {account}
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? 'Đóng menu' : 'Mở menu'}
            accessibilityState={{ expanded: open }}
            onPress={() => {
              setOpen(!open);
              setOpenedAt(pathname);
            }}
            style={styles.menuButton}
          >
            <MenuIcon open={open} />
          </Pressable>
        )}
      </View>
      {!wide && open ? (
        <View style={styles.menu}>
          {links}
          <View style={styles.divider} />
          {account}
        </View>
      ) : null}
    </View>
  );
}

function MenuIcon({ open }: { open: boolean }) {
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

export function SiteFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Code AGPL-3.0 · Dữ liệu CC BY-SA 4.0 · </Text>
      <Link href="/credits" style={styles.footerLink}>
        Nguồn tham khảo
      </Link>
      <Text style={styles.footerText}> · </Text>
      <Link href="/data-sources" style={styles.footerLink}>
        Nguồn dữ liệu &amp; yêu cầu sửa/gỡ
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
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
  menuLinkActive: {
    borderBottomWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
  },
  account: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  accountName: { fontSize: 14, color: colors.text },
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 22, height: 16, justifyContent: 'space-between' },
  bar: { height: 2, borderRadius: 1, backgroundColor: colors.text },
  menu: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 2 },
  menuLink: { paddingVertical: 12, fontSize: 16 },
  menuAccount: { paddingTop: space.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: space.xl,
  },
  footerText: { fontSize: 13, color: colors.muted },
  footerLink: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
});
