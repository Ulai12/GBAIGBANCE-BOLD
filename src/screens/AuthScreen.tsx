import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { signIn, signUp } from '@/services/auth';
import { validateEmail, validatePassword, sanitizeInput } from '@/security/rbac';
import type { UserRole } from '@/types';
import type { ToastData } from '@/components/Toast';

interface AuthScreenProps {
  mode: 'login' | 'signup';
  onSuccess: () => void;
  onToggleMode: () => void;
  onForgotPassword: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function AuthScreen({ mode, onSuccess, onToggleMode, onForgotPassword, onToast }: AuthScreenProps) {
  const { t } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('participant');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = t('auth', 'errors.required');
    else if (!validateEmail(email)) newErrors.email = t('auth', 'errors.invalidEmail');
    if (!password) newErrors.password = t('auth', 'errors.required');
    else if (!validatePassword(password)) newErrors.password = t('auth', 'errors.weakPassword');
    if (mode === 'signup' && !name.trim()) newErrors.name = t('auth', 'errors.required');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setLoading(true);
    try {
      if (mode === 'signup') { await signUp(email, password, sanitizeInput(name), role); onToast({ message: 'Compte créé avec succès', type: 'success' }); }
      else { await signIn(email, password); onToast({ message: 'Connexion réussie', type: 'success' }); }
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Invalid login')) onToast({ message: t('auth', 'errors.invalidCredentials'), type: 'error' });
      else if (message.includes('already registered')) onToast({ message: t('auth', 'errors.emailExists'), type: 'error' });
      else onToast({ message: t('auth', 'errors.network'), type: 'error' });
    } finally { setLoading(false); }
  };
  const roles: { value: UserRole; labelKey: string }[] = [{ value: 'participant', labelKey: 'roleParticipant' }, { value: 'organizer', labelKey: 'roleOrganizer' }, { value: 'artist', labelKey: 'roleArtist' }];
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        <div className="mb-8"><h1 className="text-3xl font-extrabold text-[#1A1A2E]">{mode === 'login' ? 'Bon retour !' : 'Créer un compte'}</h1><p className="text-gray-500 mt-2">{mode === 'login' ? 'Connectez-vous pour continuer' : 'Rejoignez la communauté Gbaigbance'}</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (<div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth', 'name')}</label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 transition-all ${errors.name ? 'ring-2 ring-red-500' : ''}`} placeholder="Koffi Mensah" /></div>{errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}</div>)}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth', 'email')}</label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 transition-all ${errors.email ? 'ring-2 ring-red-500' : ''}`} placeholder="vous@exemple.com" /></div>{errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth', 'password')}</label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full pl-12 pr-12 py-3.5 bg-white rounded-2xl text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 transition-all ${errors.password ? 'ring-2 ring-red-500' : ''}`} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div>{errors.password && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}</div>
          {mode === 'signup' && (<div><label className="block text-sm font-medium text-gray-700 mb-2">{t('auth', 'role')}</label><div className="grid grid-cols-3 gap-2">{roles.map((r) => (<button key={r.value} type="button" onClick={() => setRole(r.value)} className={`py-3 rounded-2xl text-sm font-semibold transition-all ${role === r.value ? 'bg-[#6600FF] text-white shadow-purple' : 'bg-white text-gray-600 hover:bg-purple-50'}`}>{t('auth', r.labelKey)}</button>))}</div></div>)}
          {mode === 'login' && (<div className="text-right"><button type="button" onClick={onForgotPassword} className="text-sm text-[#6600FF] font-medium hover:underline">{t('auth', 'forgotPassword')}</button></div>)}
          <button type="submit" disabled={loading} className="btn-purple w-full py-4 mt-6 flex items-center justify-center">{loading ? t('common', 'loading') : (mode === 'login' ? t('auth', 'login') : t('auth', 'signup'))}</button>
        </form>
        <div className="flex items-center justify-center gap-2 mt-6 text-sm"><span className="text-gray-500">{mode === 'login' ? t('auth', 'noAccount') : t('auth', 'haveAccount')}</span><button onClick={onToggleMode} className="font-semibold text-[#6600FF] hover:underline">{mode === 'login' ? t('auth', 'signUpCta') : t('auth', 'loginCta')}</button></div>
      </div>
    </div>
  );
}
