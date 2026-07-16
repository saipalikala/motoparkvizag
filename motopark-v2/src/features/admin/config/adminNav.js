import {
  LayoutDashboard,
  Package,
  FolderTree,
  Layers,
  Bike,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';

/**
 * Admin sidebar navigation — the approved roadmap order (docs/HANDOFF §6),
 * with Brands replaced by Collections: V1 has no Brand model (brand is a free
 * string on the product), but it does have a Collection model, so Collections
 * CRUD takes that slot.
 *
 * `end` marks a route that should only be "active" on an exact path match
 * (the index/Dashboard route), so it doesn't stay highlighted for children.
 */
export const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/collections', label: 'Collections', icon: Layers },
  { to: '/admin/bikes', label: 'Bikes', icon: Bike },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];
