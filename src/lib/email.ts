import { supabase } from "./supabase";

type EmailType = "welcome" | "user_registered" | "business_registered" | "order_placed" | "job_application";

interface EmailParams {
  type: EmailType;
  to: string;
  userName?: string;
  businessName?: string;
  adminEmail?: string;
  orderId?: string;
  orderTotal?: number;
  customerName?: string;
  businessOwnerEmail?: string;
  dropperEmail?: string;
  jobTitle?: string;
  applicantName?: string;
  employerEmail?: string;
  role?: string;
}

export async function sendEmailNotification(params: EmailParams): Promise<void> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-notifications`;
    const { data } = await supabase.auth.getSession();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.warn("Email notification failed", await res.text());
    }
  } catch (err) {
    console.warn("Email notification error", err);
  }
}
