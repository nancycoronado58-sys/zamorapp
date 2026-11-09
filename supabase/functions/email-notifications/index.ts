import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  type: "welcome" | "user_registered" | "business_registered" | "order_placed" | "job_application";
  to: string;
  // welcome
  userName?: string;
  // business_registered
  businessName?: string;
  adminEmail?: string;
  // order_placed
  orderId?: string;
  orderTotal?: number;
  customerName?: string;
  businessOwnerEmail?: string;
  dropperEmail?: string;
  // job_application
  jobTitle?: string;
  applicantName?: string;
  employerEmail?: string;
  role?: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Zamorapp <no-reply@zamorapp.com>";
const APP_URL = Deno.env.get("APP_URL") || "https://zamorapp.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  switch (payload.type) {
    case "user_registered":
      return {
        subject: `Nuevo usuario pendiente de aprobación: ${payload.userName || "Sin nombre"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #15803d; font-size: 24px;">Nuevo usuario registrado</h1>
            <p><strong>${payload.userName || "Un usuario"}</strong> se registró en Zamorapp.</p>
            <p>Correo: <strong>${payload.to}</strong></p>
            <p>Rol solicitado: <strong>${payload.role || "customer"}</strong></p>
            <p style="margin-top: 24px;"><a href="${APP_URL}/admin?tab=users" style="background: #15803d; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Revisar usuario</a></p>
          </div>`,
      };
    case "welcome":
      return {
        subject: "Bienvenido a Zamorapp — Welcome to Zamorapp",
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #15803d; font-size: 24px;">Bienvenido a Zamorapp</h1>
            <p>Hola ${payload.userName || "amig@"},</p>
            <p>Tu cuenta ha sido creada con éxito. Ya puedes explorar negocios locales, productos, servicios, empleos y más en tu pueblo.</p>
            <p style="margin-top: 24px;"><a href="${APP_URL}" style="background: #15803d; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Ir a Zamorapp</a></p>
            <p style="color: #666; font-size: 13px; margin-top: 32px;">Zamorapp — Marketplace, Directorio y Delivery Local</p>
          </div>`,
      };
    case "business_registered":
      return {
        subject: `Nuevo negocio registrado: ${payload.businessName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #15803d; font-size: 24px;">Nuevo negocio pendiente de aprobación</h1>
            <p>El negocio <strong>${payload.businessName}</strong> ha sido registrado y está esperando aprobación del SuperAdmin.</p>
            <p style="margin-top: 24px;"><a href="${APP_URL}/admin" style="background: #15803d; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Revisar en el panel de administración</a></p>
          </div>`,
      };
    case "order_placed":
      return {
        subject: `Pedido confirmado — #${(payload.orderId || "").slice(0, 8)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #15803d; font-size: 24px;">Pedido confirmado</h1>
            <p>Gracias por tu compra, <strong>${payload.customerName || "Cliente"}</strong>.</p>
            <p>Número de pedido: <strong>#${(payload.orderId || "").slice(0, 8)}</strong></p>
            <p>Total: <strong>REF. ${payload.orderTotal ?? 0}</strong></p>
            <p>Recibirás actualizaciones a medida que tu pedido sea verificado, preparado y entregado.</p>
            <p style="margin-top: 24px;"><a href="${APP_URL}/orders" style="background: #15803d; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Ver mis pedidos</a></p>
          </div>`,
      };
    case "job_application":
      return {
        subject: `Nueva postulación — ${payload.jobTitle || "puesto"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #15803d; font-size: 24px;">Nueva postulación recibida</h1>
            <p><strong>${payload.applicantName || "Un candidato"}</strong> ha aplicado a tu oferta: <strong>${payload.jobTitle || "Empleo"}</strong>.</p>
            <p>Revisa las postulaciones desde tu panel de negocio.</p>
            <p style="margin-top: 24px;"><a href="${APP_URL}/dashboard" style="background: #15803d; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Ir al panel</a></p>
          </div>`,
      };
    default:
      return { subject: "Notificación Zamorapp", html: "<p>Notificación de Zamorapp.</p>" };
  }
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function logNotification(payload: EmailPayload, subject: string, emailSent: boolean) {
  try {
    const recipientMap: Record<string, string> = {
      welcome: payload.to,
      business_registered: payload.adminEmail || payload.to,
      order_placed: payload.to,
      job_application: payload.employerEmail || payload.to,
    };
    const userId = await supabase
      .from("profiles")
      .select("id")
      .eq("email", recipientMap[payload.type] || payload.to)
      .maybeSingle();
    await supabase.from("notifications").insert({
      user_id: userId.data?.id || null,
      title: subject,
      message: subject,
      type: emailSent ? "email_sent" : "email_pending",
    });
  } catch {
    // non-critical
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.type) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmail(payload);

    // Collect all recipient addresses for this event type
    const { data: adminSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "admin_email")
      .maybeSingle();
    const adminAddress = adminSetting?.value?.trim();
    const recipients: string[] = [payload.to, adminAddress].filter((addr): addr is string => Boolean(addr));
    if (payload.type === "business_registered" && payload.adminEmail) recipients.push(payload.adminEmail);
    if (payload.type === "order_placed") {
      if (payload.businessOwnerEmail) recipients.push(payload.businessOwnerEmail);
      if (payload.dropperEmail) recipients.push(payload.dropperEmail);
    }
    if (payload.type === "job_application" && payload.employerEmail) recipients.push(payload.employerEmail);

    let sentCount = 0;
    for (const addr of new Set(recipients)) {
      const ok = await sendViaResend(addr, subject, html);
      if (ok) sentCount++;
    }

    await logNotification(payload, subject, sentCount > 0);

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: sentCount > 0,
        recipients: recipients.length,
        provider: RESEND_API_KEY ? "resend" : "none_configured",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
