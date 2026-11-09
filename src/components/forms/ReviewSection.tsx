import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { ReviewableType, Review } from '@/types/db';
import { StarRating } from '@/components/ui/StarRating';
import { Loader2, Send } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessageSquare } from 'lucide-react';

interface Props {
  type: ReviewableType;
  id: string;
}

export function ReviewSection({ type, id }: Props) {
  const { profile, t, language } = useApp();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles(display_name, avatar_url)')
      .eq('reviewable_type', type)
      .eq('reviewable_id', id)
      .order('created_at', { ascending: false });
    setReviews((data as Review[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, [type, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError(t('review.login'));
      return;
    }
    setSubmitting(true);
    setError('');
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: profile.id,
      reviewable_type: type,
      reviewable_id: id,
      rating,
      comment,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setComment('');
    setRating(5);
    toast(language === 'es' ? 'Reseña publicada' : 'Review posted', 'success');
    loadReviews();
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
        <MessageSquare size={18} className="text-primary-600" />
        {t('review.title')}
      </h3>

      {/* Write review */}
      <div className="card p-5">
        {profile ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">{t('review.rating')}</label>
              <StarRating rating={rating} interactive onChange={setRating} size={24} />
            </div>
            <div>
              <label className="label">{t('review.comment')}</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="input" required />
            </div>
            {error && <p className="text-sm text-error-600">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {t('review.submit')}
            </button>
          </form>
        ) : (
          <p className="text-sm text-neutral-500 text-center py-3">{t('review.login')}</p>
        )}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title={language === 'es' ? 'Sin reseñas aún' : 'No reviews yet'} />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center gap-3 mb-2">
                {r.reviewer?.avatar_url ? (
                  <img src={r.reviewer.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                    {(r.reviewer?.display_name || 'A')[0]}
                  </span>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-800">{r.reviewer?.display_name || 'Anónimo'}</p>
                  <p className="text-xs text-neutral-400">{formatRelativeDate(r.created_at, language)}</p>
                </div>
                <StarRating rating={r.rating} size={14} />
              </div>
              {r.comment && <p className="text-sm text-neutral-700">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
