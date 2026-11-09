export type Role = 'customer' | 'business_owner' | 'job_seeker' | 'dropper' | 'admin';

export type BusinessStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type OrderStatus =
  | 'pending_payment'
  | 'payment_verified'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';
export type PaymentMethod = 'pago_movil' | 'bank_transfer' | 'binance' | 'cod';
export type ReviewableType = 'business' | 'product' | 'service' | 'dropper';
export type Currency = 'VES' | 'USD' | 'EUR';
export type Language = 'es' | 'en';

export interface Profile {
  id: string;
  role: Role;
  approval_status: 'pending' | 'approved' | 'rejected';
  display_name: string;
  phone: string;
  avatar_url: string;
  preferred_language: Language;
  preferred_currency: Currency;
  created_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  icon: string;
  sort_order: number;
  is_meta: boolean;
}

export interface Business {
  id: string;
  owner_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  bio: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: { d: string; h: string }[];
  latitude: number | null;
  longitude: number | null;
  logo_url: string;
  cover_url: string;
  status: BusinessStatus;
  score: number;
  reviews_count: number;
  is_featured: boolean;
  created_at: string;
  category?: Category;
}

export interface BusinessGallery {
  id: string;
  business_id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  discount_pct: number;
  stock: number;
  image_url: string;
  is_flash_offer: boolean;
  score: number;
  reviews_count: number;
  moderation_status: 'pending' | 'approved' | 'rejected';
  moderation_note: string;
  business?: Business;
  category?: Category;
}

export interface Service {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price_from: number;
  price_to: number;
  image_url: string;
  score: number;
  reviews_count: number;
  business?: Business;
}

export interface Job {
  id: string;
  business_id: string;
  title: string;
  description: string;
  location: string;
  job_type: 'full_time' | 'part_time' | 'temporary' | 'contract';
  salary_range: string;
  is_open: boolean;
  created_at: string;
  business?: Business;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  full_name: string;
  email: string;
  phone: string;
  cover_note: string;
  cv_url: string;
  status: 'submitted' | 'reviewed' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shipping_address: string;
  delivery_notes: string;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_receipt_url: string;
  status: OrderStatus;
  dropper_id: string | null;
  currency: Currency;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  business_id: string;
  name: string;
  qty: number;
  unit_price: number;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewable_type: ReviewableType;
  reviewable_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: { display_name: string; avatar_url: string };
}

export interface Dropper {
  id: string;
  profile_id: string;
  vehicle_type: 'bike' | 'motorcycle' | 'car';
  vehicle_plate: string;
  area: string;
  is_online: boolean;
  rating: number;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: 'police' | 'fire' | 'ambulance' | 'pharmacy' | 'health_center' | 'doctor' | 'clinic';
  phone: string;
  address: string;
  is_on_duty: boolean;
  sort_order: number;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export type AdvertisementStatus = 'pending_payment' | 'payment_verified' | 'active' | 'rejected' | 'expired';

export interface AdvertisementPurchase {
  id: string;
  buyer_id: string;
  business_name: string;
  business_description: string;
  website_url: string;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod;
  payment_receipt_url: string;
  status: AdvertisementStatus;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeroSlide {
  id: string;
  title_es: string;
  title_en: string;
  subtitle_es: string;
  subtitle_en: string;
  image_url: string;
  cta_label_es: string;
  cta_label_en: string;
  cta_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
