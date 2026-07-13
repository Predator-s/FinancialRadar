// Central icon mapping — one source of truth so categories and notification
// types render the same modern SVG icon everywhere. All icons are lucide-react
// (stroke-based, inherit `currentColor`, so CSS controls their colour).
import {
  Briefcase, Laptop, TrendingUp, Gift, Undo2,
  Utensils, ShoppingCart, Car, Home, Lightbulb, ShoppingBag,
  Pill, Film, Plane, BookOpen, Tag,
  AlertTriangle, Banknote, BarChart3, Info, Bell,
} from 'lucide-react';

export const CATEGORY_ICON = {
  Salary: Briefcase,
  Freelance: Laptop,
  Investment: TrendingUp,
  Gift,
  Refund: Undo2,
  Food: Utensils,
  Groceries: ShoppingCart,
  Transport: Car,
  Rent: Home,
  Utilities: Lightbulb,
  Shopping: ShoppingBag,
  Health: Pill,
  Entertainment: Film,
  Travel: Plane,
  Education: BookOpen,
  Other: Tag,
};

export function CategoryIcon({ category, size = 18, ...rest }) {
  const Icon = CATEGORY_ICON[category] || Tag;
  return <Icon size={size} {...rest} />;
}

const NOTIF_ICON = {
  anomaly: AlertTriangle,
  budget: Banknote,
  digest: BarChart3,
  info: Info,
};

export function NotifIcon({ type, size = 18, ...rest }) {
  const Icon = NOTIF_ICON[type] || Bell;
  return <Icon size={size} {...rest} />;
}
