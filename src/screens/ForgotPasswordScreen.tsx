import { useState } from 'react';
import { GlassButton } from '@/components/GlassButton';
import { FloatingNav } from '@/components/FloatingNav';
import { useApp } from '@/hooks/useApp';
import type { ToastData } from '@/components/Toast';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function ForgotPasswordScreen({ onBack, onToast }: ForgotPasswordScreenProps) {
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!email) return; setSent(true); onToast({ message: 'Lien de réinitialisation envoyé', type: 'success' }); };
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-primary-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <FloatingNav onBack={onBack} />
      <div className="max-w-md mx-auto px-6 py-12">
        {!sent ? (<>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">{t('auth', 'resetPassword')}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">{t('auth', 'resetPasswordDesc')}</p>
          <form onSubmit={handleSubmit} className="space-y-4"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth', 'email')} className="w-full px-4 py-3.5 glass rounded-2xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50" required /><GlassButton type="submit" fullWidth size="lg">{t('auth', 'sendResetLink')}</GlassButton></form>
        </>) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-success-500/15 flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Email envoyé</h2><p className="text-zinc-500 dark:text-zinc-400">Vérifiez votre boîte de réception</p>
          </div>
        )}
      </div>
    </div>
  );
}
