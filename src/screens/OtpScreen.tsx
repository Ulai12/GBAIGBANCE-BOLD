import { useState, useRef, useEffect } from 'react';
import { GlassButton } from '@/components/GlassButton';
import { FloatingNav } from '@/components/FloatingNav';
import { useApp } from '@/hooks/useApp';

interface OtpScreenProps {
  phone?: string;
  email?: string;
  onBack: () => void;
  onVerify: () => void;
}

export function OtpScreen({ phone, email, onBack, onVerify }: OtpScreenProps) {
  const { t } = useApp();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { inputs.current[0]?.focus(); }, []);
  const handleChange = (idx: number, value: string) => { if (!/^\d?$/.test(value)) return; const newCode = [...code]; newCode[idx] = value; setCode(newCode); if (value && idx < 5) inputs.current[idx + 1]?.focus(); if (newCode.every((d) => d !== '')) onVerify(); };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => { if (e.key === 'Backspace' && !code[idx] && idx > 0) inputs.current[idx - 1]?.focus(); };
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-primary-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <FloatingNav onBack={onBack} />
      <div className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">{t('auth', 'otpTitle')}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-2">{t('auth', 'otpSubtitle')}</p>
        <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-8">{phone || email}</p>
        <div className="flex gap-3 justify-between mb-8">{code.map((digit, idx) => (<input key={idx} ref={(el) => { inputs.current[idx] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} className="w-12 h-14 text-center text-2xl font-bold glass rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50" />))}</div>
        <GlassButton onClick={onVerify} fullWidth size="lg">{t('auth', 'verify')}</GlassButton>
        <div className="text-center mt-6"><button className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">{t('auth', 'resendCode')}</button></div>
      </div>
    </div>
  );
}
