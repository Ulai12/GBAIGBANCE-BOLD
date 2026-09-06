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
    <div className="min-h-screen bg-lavender">
      <FloatingNav onBack={onBack} />
      <div className="max-w-md mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] font-bold mb-2">Vérification</p>
        <h1 className="text-3xl font-extrabold text-[#171726] mb-3">{t('auth', 'otpTitle')}</h1>
        <p className="text-[#7b7e8f] mb-2">{t('auth', 'otpSubtitle')}</p>
        <p className="text-sm font-semibold text-[#6600FF] mb-8">{phone || email}</p>
        <div className="flex gap-3 justify-between mb-8">{code.map((digit, idx) => (<input key={idx} ref={(el) => { inputs.current[idx] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} className="w-12 h-14 text-center text-2xl font-bold glass rounded-2xl text-[#171726] focus:outline-none focus:ring-2 focus:ring-[#6600FF]/50" />))}</div>
        <GlassButton onClick={onVerify} fullWidth size="lg">{t('auth', 'verify')}</GlassButton>
        <div className="text-center mt-6"><button className="text-sm text-[#6600FF] font-medium hover:underline">{t('auth', 'resendCode')}</button></div>
      </div>
    </div>
  );
}
