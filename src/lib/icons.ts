import {
  Package, Refrigerator, Laptop, Shirt, BedDouble, ShoppingCart, UtensilsCrossed,
  Wrench, Briefcase, Siren, Bike, Tag, type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Package,
  Refrigerator,
  Laptop,
  Shirt,
  BedDouble,
  ShoppingCart,
  UtensilsCrossed,
  Wrench,
  Briefcase,
  Siren,
  Bike,
  Tag,
};

export function getCategoryIcon(name: string): LucideIcon {
  return iconMap[name] || Tag;
}
