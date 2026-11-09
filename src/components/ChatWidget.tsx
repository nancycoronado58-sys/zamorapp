import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User as UserIcon, Phone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { whatsappUrl } from '@/lib/siteSettings';
import type { Business, EmergencyContact } from '@/types/db';

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
}

export function ChatWidget() {
  const { t, language, settings } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: t('chat.greeting') },
  ]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyContact[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('businesses').select('*').eq('status', 'approved').limit(50).then(({ data }) => {
      setBusinesses((data as Business[]) || []);
    });
    supabase.from('emergency_contacts').select('*').order('sort_order').then(({ data }) => {
      setEmergencies((data as EmergencyContact[]) || []);
    });
  }, []);

  useEffect(() => {
    setMessages([{ role: 'bot', text: t('chat.greeting') }]);
  }, [language, t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase().trim();

    if (/(hola|hello|buenos|hi|hey)/i.test(q)) {
      return language === 'es'
        ? '¡Hola! Puedo ayudarte a encontrar negocios, productos, servicios, empleos o números de emergencia. ¿Qué necesitas?'
        : "Hi! I can help you find businesses, products, services, jobs or emergency numbers. What do you need?";
    }

    if (/(emergencia|polic|bombero|ambulancia|pharmacy|farmacia|emergency)/i.test(q)) {
      const lines = emergencies.slice(0, 4).map((e) => `${e.name}: ${e.phone}`);
      return language === 'es'
        ? `Números de emergencia:\n${lines.join('\n')}\n¿Necesitas algo más?`
        : `Emergency numbers:\n${lines.join('\n')}\nNeed anything else?`;
    }

    if (/(restaurante|comida|restaurant|food)/i.test(q)) {
      const found = businesses.filter((b) => /restaurante|sazon|comida/i.test(b.name + b.bio));
      if (found.length > 0) {
        return language === 'es'
          ? `Encontré: ${found.slice(0, 3).map((b) => b.name).join(', ')}. Visita la página de Tiendas para ver más.`
          : `I found: ${found.slice(0, 3).map((b) => b.name).join(', ')}. Visit the Stores page for more.`;
      }
    }

    if (/(tecn|electron|laptop|celular|tech)/i.test(q)) {
      const found = businesses.filter((b) => /tecno|electron|tech/i.test(b.name + b.bio));
      if (found.length > 0) {
        return language === 'es'
          ? `Tecnología disponible: ${found.slice(0, 3).map((b) => b.name).join(', ')}.`
          : `Tech available: ${found.slice(0, 3).map((b) => b.name).join(', ')}.`;
      }
    }

    if (/(servicio|electricista|plomero|alba|aire|service|plumber)/i.test(q)) {
      return language === 'es'
        ? 'Contamos con servicios profesionales: electricista, albañil, técnico en aire acondicionado, damas de servicio y más. Revisa la sección de Servicios.'
        : 'We have professional services: electrician, mason, AC technician, housekeeping and more. Check the Services section.';
    }

    if (/(empleo|trabajo|job|work)/i.test(q)) {
      return language === 'es'
        ? 'Visita la sección de Empleos para ver las vacantes locales activas y postular directamente.'
        : 'Visit the Jobs section to see active local vacancies and apply directly.';
    }

    if (/(envio|delivery|reparto|dropper|deliver)/i.test(q)) {
      return language === 'es'
        ? 'Contamos con repartidores disponibles. Realiza tu pedido y un dropper lo entregará. Visita la sección de Repartidores.'
        : 'We have droppers available. Place your order and a dropper will deliver it. Visit the Droppers section.';
    }

    if (/(horario|hour|open|abierto|cerrado)/i.test(q)) {
      return language === 'es'
        ? 'Los horarios varían según cada negocio. Abre el perfil del negocio para ver su horario específico.'
        : 'Hours vary by business. Open the business profile to see its specific hours.';
    }

    const matched = businesses.find((b) =>
      b.name.toLowerCase().includes(q) || b.bio?.toLowerCase().includes(q)
    );
    if (matched) {
      return language === 'es'
        ? `Encontré "${matched.name}". ${matched.bio?.slice(0, 100) || ''} Visita su página para más detalles.`
        : `I found "${matched.name}". ${matched.bio?.slice(0, 100) || ''} Visit its page for more details.`;
    }

    return language === 'es'
      ? 'No estoy seguro de eso. Puedo ayudarte con negocios, productos, servicios, empleos y emergencias. ¿O prefieres hablar con un asesor por WhatsApp?'
      : "I'm not sure about that. I can help with businesses, products, services, jobs and emergencies. Or would you prefer to talk to a human via WhatsApp?";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setTimeout(() => {
      const response = generateResponse(userMsg);
      setMessages((prev) => [...prev, { role: 'bot', text: response }]);
    }, 600);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[85] flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-card-hover hover:bg-primary-700 transition-colors group"
        aria-label="Chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={24} />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-5 z-[85] w-[calc(100vw-2.5rem)] max-w-sm h-[28rem] bg-white rounded-2xl shadow-card-hover border border-neutral-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary-600 text-white px-4 py-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-bold">{t('chat.title')}</p>
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-300 animate-pulse" />
                  {language === 'es' ? 'En línea' : 'Online'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-neutral-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'bot' && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-600 shrink-0">
                      <Bot size={14} />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-white border border-neutral-100 text-neutral-700 rounded-bl-md'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.role === 'user' && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 shrink-0">
                      <UserIcon size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* WhatsApp handoff */}
            <div className="px-3 py-2 border-t border-neutral-100 bg-white">
              <a
                href={`${whatsappUrl(settings)}?text=Hola%20${encodeURIComponent(settings.business_name)}%20necesito%20ayuda`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-success-700 hover:bg-success-50 rounded-lg py-1.5 transition"
              >
                <Phone size={12} />
                {t('chat.whatsapp')}
                <ArrowRight size={12} />
              </a>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-neutral-100 bg-white flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('chat.placeholder')}
                className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-xl bg-primary-600 p-2 text-white hover:bg-primary-700 disabled:opacity-40 transition"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
