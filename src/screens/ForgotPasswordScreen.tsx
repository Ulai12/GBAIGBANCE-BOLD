import { useState } from 'react';
import { GlassButton } from '@/components/GlassButton';
import { FloatingNav } from '@/components/FloatingNav';
import { useApp } from '@/hooks/useApp';
import { sendPasswordResetEmail } from '@/services/auth';
import type { ToastData } from '@/components/Toast';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function ForgotPasswordScreen({ onBack, onToast }: ForgotPasswordScreenProps) {
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(email.trim());
      setSent(true);
      onToast({ message: t('auth', 'resetEmailSent'), type: 'success' });
    } catch {
      setError(t('auth', 'resetEmailError'));
      onToast({ message: t('auth', 'resetEmailFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen">
      <FloatingNav onBack={onBack} />
      <div className="max-w-md mx-auto px-6 py-16">
        {!sent ? (<>
          <p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] font-bold mb-2">{t('auth', 'accountSecurity')}</p>
          <h1 className="text-3xl font-extrabold text-[#171726] mb-3">{t('auth', 'resetPassword')}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">{t('auth', 'resetPasswordDesc')}</p>
          <form onSubmit={handleSubmit} className="space-y-4"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth', 'email')} className="w-full px-4 py-4 glass rounded-2xl text-[#171726] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" required />{error && <p className="text-sm text-red-500">{error}</p>}<GlassButton type="submit" fullWidth size="lg" disabled={loading}>{loading ? t('auth', 'sending') : t('auth', 'sendResetLink')}</GlassButton></form>
        </>) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
            <h2 className="text-xl font-extrabold text-[#171726] mb-2">{t('auth', 'resetEmailSentTitle')}</h2><p className="text-[#7b7e8f]">{t('auth', 'resetEmailSentDescription')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
