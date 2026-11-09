import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Upload, CheckCircle, ArrowLeft, Banknote, Smartphone, Landmark, Wallet, Copy, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { uploadMedia } from '@/lib/storage';
import { sendEmailNotification } from '@/lib/email';
import { formatPrice, discountedPrice } from '@/lib/currency';
import type { PaymentMethod } from '@/types/db';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ShoppingCart } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export function CheckoutPage() {
  const { t, language, currency, profile, session, loading: authLoading } = useApp();
  const { items, subtotal, clear } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdvertising = searchParams.get('advertising') === 'weekly';

  const [name, setName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const deliveryFee = items.length > 0 ? 5 : 0;
  const tax = subtotal * 0.18;
  const total = subtotal + deliveryFee + tax;

  const paymentOptions: { value: PaymentMethod; label: string; icon: typeof Smartphone; hint: string }[] = [
    { value: 'pago_movil', label: t('checkout.mobile'), icon: Smartphone, hint: language === 'es' ? 'Mercantil · comprobante requerido' : 'Mercantil · receipt required' },
    { value: 'bank_transfer', label: t('checkout.transfer'), icon: Landmark, hint: language === 'es' ? 'Cuenta corriente · comprobante requerido' : 'Checking account · receipt required' },
    { value: 'binance', label: t('checkout.binance'), icon: Wallet, hint: language === 'es' ? '1 USD = 1 USDT · comprobante requerido' : '1 USD = 1 USDT · receipt required' },
    { value: 'cod', label: t('checkout.cod'), icon: Banknote, hint: language === 'es' ? 'Paga al recibir' : 'Pay on delivery' },
  ];

  const selectedPayment = paymentOptions.find((option) => option.value === paymentMethod);

  const paymentDetails: Record<Exclude<PaymentMethod, 'cod'>, { label: string; value: string }[]> = {
    pago_movil: [
      { label: 'Banco', value: 'Mercantil 0105' },
      { label: 'Cédula', value: '16.671.438' },
      { label: 'Teléfono', value: '04242580390' },
      { label: 'Monto', value: formatPrice(total, currency) },
    ],
    bank_transfer: [
      { label: 'Cuenta corriente', value: '01050157151157016723' },
      { label: 'Cédula', value: '16.671.438' },
      { label: 'Banco', value: 'Mercantil 0105' },
      { label: 'Titular', value: 'Luis Alberto Linares Coronado' },
      { label: 'Monto', value: formatPrice(total, currency) },
    ],
    binance: [
      { label: 'Código ID', value: '937595194' },
      { label: 'Tasa', value: '1 USD = 1 USDT' },
      { label: 'Monto', value: `${total.toFixed(2)} USDT` },
    ],
  };

  const copyPaymentValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      toast(language === 'es' ? `${label} copiado` : `${label} copied`, 'success');
      window.setTimeout(() => setCopiedField(''), 1800);
    } catch {
      setError(language === 'es' ? 'No se pudo copiar el dato' : 'Could not copy the value');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, 'receipts');
      setReceiptUrl(url);
      toast(language === 'es' ? 'Comprobante subido' : 'Receipt uploaded', 'success');
    } catch {
      setError(language === 'es' ? 'No se pudo subir el comprobante. Intenta con una imagen válida de hasta 5 MB.' : 'The receipt could not be uploaded. Try a valid image up to 5 MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setError(language === 'es' ? 'Inicia sesión para confirmar tu pedido.' : 'Sign in to confirm your order.');
      return;
    }
    if (items.length === 0) return;
    if (paymentMethod !== 'cod' && !receiptUrl) {
      setError(language === 'es' ? 'Sube el comprobante de pago' : 'Upload the payment receipt');
      return;
    }
    setSubmitting(true);
    setError('');

    const businessIds = [...new Set(items.map((i) => i.product.business_id))];
    const orderId = crypto.randomUUID();

    const { error: orderErr } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        customer_id: session.user.id,
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        shipping_address: address,
        delivery_notes: notes,
        subtotal,
        tax,
        delivery_fee: deliveryFee,
        total,
        payment_method: paymentMethod,
        payment_receipt_url: receiptUrl,
        status: paymentMethod === 'cod' ? 'preparing' : 'pending_payment',
        currency,
      });

    if (orderErr) {
      setError(language === 'es' ? 'No se pudo crear el pedido. Verifica tu sesión e inténtalo nuevamente.' : 'The order could not be created. Check your session and try again.');
      setSubmitting(false);
      return;
    }

    const orderItems = items.map((i) => ({
      order_id: orderId,
      product_id: i.product.id,
      business_id: i.product.business_id,
      name: i.product.name,
      qty: i.qty,
      unit_price: discountedPrice(i.product.price, i.product.discount_pct),
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) {
      setError(language === 'es' ? 'No se pudieron guardar los productos del pedido.' : 'The order items could not be saved.');
      setSubmitting(false);
      return;
    }

    // Insert notifications for each business owner and send emails
    const ownerEmails: string[] = [];
    for (const bid of businessIds) {
      const { data: biz } = await supabase.from('businesses').select('owner_id, name').eq('id', bid).maybeSingle();
      if (biz?.owner_id) {
        await supabase.from('notifications').insert({
          user_id: biz.owner_id,
          type: 'new_order',
          title: language === 'es' ? 'Nuevo pedido recibido' : 'New order received',
          body: `${language === 'es' ? 'Pedido' : 'Order'} #${orderId.slice(0, 8)} - ${biz.name}`,
          payload: { order_id: orderId },
        });
        const { data: owner } = await supabase.from('profiles').select('email').eq('id', biz.owner_id).maybeSingle();
        if (owner?.email) ownerEmails.push(owner.email);
      }
    }

    await sendEmailNotification({
      type: 'order_placed',
      to: email,
      orderId,
      orderTotal: total,
      customerName: name,
      businessOwnerEmail: ownerEmails[0],
    });

    setSubmitting(false);
    clear();
    toast(t('checkout.success'), 'success');
    navigate(`/orders/${orderId}`);
  };

  if (authLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (!session) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={ShoppingCart}
          title={language === 'es' ? 'Inicia sesión para pagar' : 'Sign in to pay'}
          action={<Link to="/signin?redirect=/checkout" className="btn-primary">{t('nav.signIn')}</Link>}
        />
      </div>
    );
  }

  if (isAdvertising) return <AdvertisementCheckout />;

  if (items.length === 0) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={ShoppingCart}
          title={t('cart.empty')}
          action={<Link to="/stores" className="btn-primary">{t('cart.continue')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-app py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-4">
        <ArrowLeft size={14} /> {t('cart.continue')}
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">{t('checkout.title')}</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & shipping */}
          <div className="card p-5">
            <h2 className="font-bold text-neutral-900 mb-4">{t('checkout.contact')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">{t('checkout.name')}</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">{t('checkout.phone')}</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('checkout.email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('checkout.address')}</label>
                <input required value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('checkout.notes')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card p-5">
            <h2 className="font-bold text-neutral-900 mb-4">{t('checkout.payment')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paymentOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(opt.value);
                      setError('');
                      if (opt.value !== 'cod') setShowPaymentModal(true);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      paymentMethod === opt.value ? 'border-primary-400 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Icon size={20} className={paymentMethod === opt.value ? 'text-primary-600' : 'text-neutral-500'} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-800">{opt.label}</p>
                      <p className="text-xs text-neutral-500">{opt.hint}</p>
                    </div>
                    {paymentMethod === opt.value && <CheckCircle size={16} className="text-primary-600" />}
                  </button>
                );
              })}
            </div>

            {paymentMethod !== 'cod' && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-primary-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-primary-800">{receiptUrl ? (language === 'es' ? 'Comprobante listo' : 'Receipt ready') : (language === 'es' ? 'Falta el comprobante' : 'Receipt required')}</p>
                  <p className="text-xs text-primary-700">{selectedPayment?.label}</p>
                </div>
                <button type="button" onClick={() => setShowPaymentModal(true)} className="btn-outline px-3 py-2 text-xs">
                  {language === 'es' ? 'Ver datos y comprobante' : 'View details and receipt'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-24">
            <h2 className="font-bold text-neutral-900 mb-3">
              {language === 'es' ? 'Resumen del pedido' : 'Order summary'}
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin mb-3">
              {items.map((i) => {
                const final = discountedPrice(i.product.price, i.product.discount_pct);
                return (
                  <div key={i.product.id} className="flex gap-2 text-sm">
                    <img src={i.product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover bg-neutral-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-neutral-800">{i.product.name}</p>
                      <p className="text-xs text-neutral-500">{i.qty} × {formatPrice(final, currency)}</p>
                    </div>
                    <span className="font-semibold text-neutral-800">{formatPrice(final * i.qty, currency)}</span>
                  </div>
                );
              })}
            </div>
            <div className="h-px bg-neutral-100 my-2" />
            <div className="space-y-1.5">
              <Row label={t('cart.subtotal')} value={formatPrice(subtotal, currency)} />
              <Row label={t('cart.tax')} value={formatPrice(tax, currency)} />
              <Row label={t('cart.delivery')} value={formatPrice(deliveryFee, currency)} />
              <div className="h-px bg-neutral-200 my-1" />
              <Row label={t('cart.total')} value={formatPrice(total, currency)} bold />
            </div>
            {error && <p className="text-sm text-error-600 mt-3">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full mt-4">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {t('checkout.placeOrder')}
            </button>
          </div>
        </div>
      </form>

      {selectedPayment && selectedPayment.value !== 'cod' && (
        <Modal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title={`${selectedPayment.label} · ${language === 'es' ? 'Datos de pago' : 'Payment details'}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-neutral-900 p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-neutral-300">{language === 'es' ? 'Monto total del pedido' : 'Total order amount'}</p>
              <p className="mt-1 text-2xl font-bold">{formatPrice(total, currency)}</p>
              {selectedPayment.value === 'binance' && <p className="text-sm text-neutral-300">{total.toFixed(2)} USDT · 1 USD = 1 USDT</p>}
            </div>

            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {paymentDetails[selectedPayment.value].map((detail) => (
                <div key={detail.label} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-500">{detail.label}</p>
                    <p className="break-words text-sm font-semibold text-neutral-900">{detail.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyPaymentValue(detail.label, detail.value)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                  >
                    {copiedField === detail.label ? <Check size={14} /> : <Copy size={14} />}
                    {copiedField === detail.label ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar' : 'Copy')}
                  </button>
                </div>
              ))}
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 p-5 text-center hover:border-primary-300 transition">
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              {uploading ? (
                <Loader2 size={22} className="animate-spin text-primary-600" />
              ) : receiptUrl ? (
                <>
                  <CheckCircle size={22} className="text-success-600" />
                  <span className="text-sm font-semibold text-success-700">{language === 'es' ? 'Comprobante cargado' : 'Receipt uploaded'}</span>
                  <img src={receiptUrl} alt={language === 'es' ? 'Comprobante de pago' : 'Payment receipt'} className="max-h-28 rounded-lg" />
                </>
              ) : (
                <>
                  <Upload size={22} className="text-neutral-400" />
                  <span className="text-sm font-semibold text-neutral-700">{language === 'es' ? 'Subir comprobante de pago' : 'Upload payment receipt'}</span>
                  <span className="text-xs text-neutral-500">{language === 'es' ? 'Imagen de hasta 5 MB' : 'Image up to 5 MB'}</span>
                </>
              )}
            </label>

            <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-primary w-full">
              {language === 'es' ? 'Listo, continuar' : 'Done, continue'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'text-base font-bold text-neutral-900' : 'text-sm text-neutral-600'}>{label}</span>
      <span className={bold ? 'text-base font-bold text-neutral-900' : 'text-sm font-semibold text-neutral-800'}>{value}</span>
    </div>
  );
}

function AdvertisementCheckout() {
  const { language, currency } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const packageAmount = 9.90;
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Exclude<PaymentMethod, 'cod'>>('pago_movil');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState('');

  const paymentDetails: Record<Exclude<PaymentMethod, 'cod'>, { label: string; value: string }[]> = {
    pago_movil: [
      { label: 'Banco', value: 'Mercantil 0105' },
      { label: 'Cédula', value: '16.671.438' },
      { label: 'Teléfono', value: '04242580390' },
      { label: 'Monto', value: formatPrice(packageAmount, currency) },
    ],
    bank_transfer: [
      { label: 'Cuenta corriente', value: '01050157151157016723' },
      { label: 'Cédula', value: '16.671.438' },
      { label: 'Banco', value: 'Mercantil 0105' },
      { label: 'Monto', value: formatPrice(packageAmount, currency) },
    ],
    binance: [
      { label: 'Código ID', value: '937595194' },
      { label: 'Tasa', value: '1 USD = 1 USDT' },
      { label: 'Monto', value: `${packageAmount.toFixed(2)} USDT` },
    ],
  };

  const handleReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setReceiptUrl(await uploadMedia(file, 'receipts'));
      setError('');
      toast(language === 'es' ? 'Comprobante cargado' : 'Receipt uploaded', 'success');
    } catch {
      setError(language === 'es' ? 'No se pudo cargar el comprobante.' : 'The receipt could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receiptUrl) {
      setError(language === 'es' ? 'Sube el comprobante de pago para continuar.' : 'Upload your payment receipt to continue.');
      setShowPayment(true);
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: insertError } = await supabase.from('advertisement_purchases').insert({
      business_name: businessName.trim(),
      business_description: description.trim(),
      website_url: websiteUrl.trim(),
      currency,
      payment_method: paymentMethod,
      payment_receipt_url: receiptUrl,
    });
    setSubmitting(false);
    if (insertError) {
      setError(language === 'es' ? 'No se pudo registrar la solicitud. Inténtalo nuevamente.' : 'The request could not be submitted. Try again.');
      return;
    }
    toast(language === 'es' ? 'Solicitud enviada para revisión' : 'Request sent for review', 'success');
    navigate('/');
  };

  return (
    <div className="container-app py-8 md:py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 mb-5"><ArrowLeft size={14} /> {language === 'es' ? 'Volver a la portada' : 'Back to home'}</Link>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="card p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{language === 'es' ? 'Publicidad Zamorapp' : 'Zamorapp advertising'}</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-neutral-950">{language === 'es' ? 'Destaca tu negocio durante una semana' : 'Feature your business for one week'}</h1>
            <p className="mt-2 text-sm text-neutral-600">{language === 'es' ? 'Paquete único de 9,90 USD o su equivalente en EUR/BCV. Tu anuncio será revisado antes de publicarse.' : 'One-time package of 9.90 USD or its EUR/BCV equivalent. Your ad will be reviewed before publishing.'}</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">{language === 'es' ? 'Nombre del negocio' : 'Business name'}</label><input required maxLength={120} value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="input" /></div>
              <div><label className="label">{language === 'es' ? 'Enlace del negocio' : 'Business link'}</label><input type="url" maxLength={500} value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} className="input" placeholder="https://" /></div>
              <div className="sm:col-span-2"><label className="label">{language === 'es' ? 'Mensaje publicitario' : 'Advertising message'}</label><textarea required maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="input" /></div>
            </div>
          </div>

          <div className="card p-5 md:p-6">
            <h2 className="font-bold text-neutral-900 mb-4">{language === 'es' ? 'Método de pago' : 'Payment method'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['pago_movil', 'bank_transfer', 'binance'] as const).map((method) => (
                <button key={method} type="button" onClick={() => { setPaymentMethod(method); setShowPayment(true); }} className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${paymentMethod === method ? 'border-primary-400 bg-primary-50 text-primary-800' : 'border-neutral-200 hover:border-primary-200'}`}>
                  {method === 'pago_movil' ? 'Pago móvil' : method === 'bank_transfer' ? 'Transferencia' : 'Binance'}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowPayment(true)} className="btn-outline mt-4 w-full sm:w-auto">{language === 'es' ? 'Ver datos y cargar comprobante' : 'View details and upload receipt'}</button>
            {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
          </div>
          <button type="submit" disabled={submitting || uploading} className="btn-primary w-full sm:w-auto">{submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} {language === 'es' ? 'Enviar solicitud de publicidad' : 'Submit advertising request'}</button>
        </form>

        <aside className="card overflow-hidden lg:sticky lg:top-24">
          <div className="bg-neutral-950 p-6 text-white"><p className="text-sm text-white/60">{language === 'es' ? 'Paquete semanal' : 'Weekly package'}</p><p className="mt-2 text-3xl font-bold">{formatPrice(packageAmount, currency)}</p><p className="mt-1 text-xs text-white/65">{language === 'es' ? 'Equivalente según moneda seleccionada' : 'Equivalent in selected currency'}</p></div>
          <div className="p-5 text-sm text-neutral-600 space-y-3"><p>{language === 'es' ? 'Incluye exposición en el espacio publicitario destacado de la portada.' : 'Includes exposure in the featured advertising slot on the homepage.'}</p><p>{language === 'es' ? 'Publicación después de verificar el pago.' : 'Published after payment verification.'}</p></div>
        </aside>
      </div>

      <Modal open={showPayment} onClose={() => setShowPayment(false)} title={language === 'es' ? 'Datos de pago y comprobante' : 'Payment details and receipt'} size="md">
        <div className="space-y-4">
          <div className="rounded-xl bg-neutral-900 p-4 text-white"><p className="text-xs uppercase tracking-wide text-neutral-300">{language === 'es' ? 'Monto del paquete' : 'Package amount'}</p><p className="mt-1 text-2xl font-bold">{formatPrice(packageAmount, currency)}</p></div>
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">{paymentDetails[paymentMethod].map((detail) => <div key={detail.label} className="px-4 py-3"><p className="text-xs text-neutral-500">{detail.label}</p><p className="text-sm font-semibold text-neutral-900">{detail.value}</p></div>)}</div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 p-5 text-center hover:border-primary-300 transition"><input type="file" accept="image/*" onChange={handleReceipt} className="hidden" />{uploading ? <Loader2 size={22} className="animate-spin text-primary-600" /> : receiptUrl ? <><CheckCircle size={22} className="text-success-600" /><span className="text-sm font-semibold text-success-700">{language === 'es' ? 'Comprobante cargado' : 'Receipt uploaded'}</span></> : <><Upload size={22} className="text-neutral-400" /><span className="text-sm font-semibold text-neutral-700">{language === 'es' ? 'Subir comprobante' : 'Upload receipt'}</span><span className="text-xs text-neutral-500">{language === 'es' ? 'Imagen de hasta 5 MB' : 'Image up to 5 MB'}</span></>}</label>
          <button type="button" onClick={() => setShowPayment(false)} className="btn-primary w-full">{language === 'es' ? 'Listo, continuar' : 'Done, continue'}</button>
        </div>
      </Modal>
    </div>
  );
}
