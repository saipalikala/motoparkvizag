import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';

/**
 * Admin sidebar navigation — the approved roadmap order (docs/HANDOFF §6):
 * Foundation → Products → Categories → Brands → Orders → Customers →
 * Analytics → Settings.
 *
 * `end` marks a route that should only be "active" on an exact path match
 * (the index/Dashboard route), so it doesn't stay highlighted for children.
 */
export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/brands', label: 'Brands', icon: Tag },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];
