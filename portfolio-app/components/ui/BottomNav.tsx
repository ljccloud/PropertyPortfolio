'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/overview',    label: 'Overview',    icon: '⌂' },
  { href: '/properties',  label: 'Properties',  icon: '⊞' },
  { href: '/finance',     label: 'Finance',     icon: '£' },
  { href: '/maintenance', label: 'Maintenance', icon: '🔧' },
  { href: '/documents',   label: 'Documents',   icon: '📄' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      height: 'var(--nav-h)',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(({ href, label, icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: active ? 'var(--text)' : 'var(--text3)',
              padding: '8px 4px',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
