import { useNavigate } from 'react-router-dom';
import { Store, Wrench, Briefcase, Bike, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
}

export function PublishModal({ open, onClose }: PublishModalProps) {
  const { t, profile, language } = useApp();
  const navigate = useNavigate();

  const options = [
    {
      icon: Store,
      title: language === 'es' ? 'Registrar negocio' : 'Register business',
      desc: language === 'es' ? 'Crea tu perfil de tienda o comercio local' : 'Create your local store profile',
      color: 'bg-primary-50 text-primary-600',
      href: '/dashboard?tab=business&new=1',
      requireRole: 'business_owner' as const,
    },
    {
      icon: Wrench,
      title: language === 'es' ? 'Ofrecer servicio' : 'Offer a service',
      desc: language === 'es' ? 'Publica servicios profesionales u oficios' : 'Publish professional or trade services',
      color: 'bg-accent-50 text-accent-600',
      href: '/dashboard?tab=services&new=1',
      requireRole: 'business_owner' as const,
    },
    {
      icon: Briefcase,
      title: language === 'es' ? 'Publicar empleo' : 'Post a job',
      desc: language === 'es' ? 'Busca personal para tu negocio' : 'Find staff for your business',
      color: 'bg-secondary-50 text-secondary-600',
      href: '/dashboard?tab=jobs&new=1',
      requireRole: 'business_owner' as const,
    },
    {
      icon: Bike,
      title: language === 'es' ? 'Ser repartidor' : 'Become a dropper',
      desc: language === 'es' ? 'Regístrate para hacer entregas locales' : 'Register to make local deliveries',
      color: 'bg-success-50 text-success-600',
      href: '/dashboard?tab=dropper',
      requireRole: 'dropper' as const,
    },
  ];

  const handleSelect = (opt: typeof options[number]) => {
    if (!profile) {
      onClose();
      navigate(`/signup?role=${opt.requireRole}&redirect=${encodeURIComponent(opt.href)}`);
      return;
    }
    if (profile.role !== opt.requireRole && profile.role !== 'admin') {
      onClose();
      navigate(`/signup?role=${opt.requireRole}&redirect=${encodeURIComponent(opt.href)}`);
      return;
    }
    onClose();
    navigate(opt.href);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('nav.publish')} size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.title}
              onClick={() => handleSelect(opt)}
              className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left hover:border-primary-300 hover:bg-primary-50/30 transition group"
            >
              <span className={`rounded-xl p-2.5 ${opt.color} group-hover:scale-110 transition-transform`}>
                <Icon size={22} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900">{opt.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      {!profile && (
        <p className="mt-4 text-xs text-neutral-500 text-center">
          {language === 'es' ? 'Necesitas una cuenta para publicar. ' : 'You need an account to publish. '}
          <button onClick={() => { onClose(); navigate('/signup'); }} className="text-primary-600 font-semibold hover:underline">
            {t('nav.signUp')}
          </button>
        </p>
      )}
    </Modal>
  );
}
