import {
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  Factory,
  FlaskConical,
  Home,
  IdCard,
  Layers,
  Package,
  Receipt,
  Ruler,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
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
    items: [
      { label: 'Products', href: '/products', icon: Package, available: true },
      {
        label: 'Raw materials',
        href: '/raw-materials',
        icon: FlaskConical,
        available: true,
      },
      {
        label: 'Measurement units',
        href: '/measurement-units',
        icon: Ruler,
        available: true,
      },
      { label: 'Employees', href: '/employees', icon: IdCard, available: true },
      { label: 'Suppliers', href: '/suppliers', icon: Warehouse, available: true },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', href: '/customers', icon: Users, available: true },
      { label: 'Orders', href: '/orders', icon: ShoppingCart, available: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Production', href: '/production', icon: Factory, available: true },
      { label: 'Curing', href: '/curing', icon: Layers, available: true },
      { label: 'Stock', href: '/stock', icon: Boxes, available: false },
      { label: 'Deliveries', href: '/deliveries', icon: Truck, available: false },
      { label: 'Drivers', href: '/drivers', icon: Users, available: true },
      { label: 'Vehicles', href: '/vehicles', icon: Truck, available: true },
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
        available: true,
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
