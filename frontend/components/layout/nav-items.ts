import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  FileText,
  Factory,
  Home,
  Layers,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { CurrentUser } from '@/lib/permissions';
import { canManageUsers, canChangeSettings, canViewAuditLogs } from '@/lib/permissions';

/**
 * Sidebar and mobile navigation items.
 *
 * Most modules do not exist yet. They are listed as `available: false` so the
 * shape of the system is visible from the start, but they are shown as disabled
 * rather than as links that lead nowhere.
 *
 * As each phase ships, flip `available` to true and set the real `href`.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
  /** When set, the item is hidden unless the check passes. */
  visible?: (user: CurrentUser | null) => boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Home', href: '/', icon: Home, available: true }],
  },
  {
    label: 'Master data',
    items: [{ label: 'Products', href: '/products', icon: Package, available: true }],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', href: '/customers', icon: Users, available: false },
      { label: 'Quotations', href: '/quotations', icon: FileText, available: false },
      { label: 'Orders', href: '/orders', icon: ShoppingCart, available: false },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Production', href: '/production', icon: Factory, available: false },
      { label: 'Curing', href: '/curing', icon: Layers, available: false },
      { label: 'Stock', href: '/stock', icon: Boxes, available: false },
      { label: 'Deliveries', href: '/deliveries', icon: Truck, available: false },
    ],
  },
  {
    label: 'Purchasing',
    items: [{ label: 'Purchases', href: '/purchases', icon: ClipboardList, available: false }],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', href: '/invoices', icon: Receipt, available: false },
      { label: 'Payments', href: '/payments', icon: Wallet, available: false },
      { label: 'Expenses', href: '/expenses', icon: BadgeDollarSign, available: false },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Users',
        href: '/users',
        icon: Users,
        available: false,
        visible: canManageUsers,
      },
      {
        label: 'Audit logs',
        href: '/audit-logs',
        icon: ShieldCheck,
        available: false,
        visible: canViewAuditLogs,
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        available: false,
        visible: canChangeSettings,
      },
    ],
  },
];

/**
 * Filters the navigation for a user.
 *
 * This only decides what is displayed. The backend refuses anything the user
 * may not do, regardless of what the interface shows.
 */
export function visibleNavGroups(user: CurrentUser | null): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.visible?.(user) ?? true),
  })).filter((group) => group.items.length > 0);
}
