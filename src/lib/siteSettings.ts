export interface SiteSettings {
  business_name: string;
  contact_phone: string;
  contact_phone_display: string;
  whatsapp_number: string;
  contact_email: string;
  admin_email: string;
  office_address: string;
  auto_publish_products: string;
}

export type SiteSettingKey = keyof SiteSettings;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  business_name: 'Zamorapp',
  contact_phone: '+584242580390',
  contact_phone_display: '+58 424 258 0390',
  whatsapp_number: '584242580390',
  contact_email: 'info@zamorapp.com',
  admin_email: 'admin@zamorapp.com',
  office_address: '',
  auto_publish_products: 'true',
};

export function mergeSiteSettings(rows: { key: string; value: string }[]): SiteSettings {
  const merged: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
  for (const row of rows) {
    if (row.key in merged) merged[row.key as SiteSettingKey] = row.value;
  }
  return merged;
}

export function whatsappUrl(settings: SiteSettings): string {
  return `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`;
}
