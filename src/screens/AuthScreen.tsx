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

const fieldClass = (invalid: boolean) =>
  [
    'min-h-11 w-full rounded-2xl border bg-white py-3.5 pl-12 text-base text-[#17131D] shadow-2xs',
    'placeholder:text-gray-400 transition-colors motion-reduce:transition-none',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2',
    'dark:bg-[#14121E] dark:text-white dark:placeholder:text-gray-500 dark:focus-visible:ring-offset-[#14121E]',
    invalid
      ? 'border-red-500 ring-2 ring-red-500/80'
      : 'border-black/[0.08] dark:border-white/[0.12]',
  ].join(' ');

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
      if (mode === 'signup') {
        await signUp(email, password, sanitizeInput(name), role);
        onToast({ message: 'Compte créé avec succès', type: 'success' });
      } else {
        await signIn(email, password);
        onToast({ message: 'Connexion réussie', type: 'success' });
      }
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Invalid login')) onToast({ message: t('auth', 'errors.invalidCredentials'), type: 'error' });
      else if (message.includes('already registered')) onToast({ message: t('auth', 'errors.emailExists'), type: 'error' });
      else onToast({ message: t('auth', 'errors.network'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const roles: { value: UserRole; labelKey: string }[] = [
    { value: 'participant', labelKey: 'roleParticipant' },
    { value: 'organizer', labelKey: 'roleOrganizer' },
    { value: 'artist', labelKey: 'roleArtist' },
  ];

  return (
    <div className="min-h-dvh overflow-y-auto pt-safe-header pb-safe-nav">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center px-5 py-8">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA]">
            Gbaigbance
          </p>
          <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-[#17131D] dark:text-white min-[380px]:text-3xl">
            {mode === 'login' ? 'Bon retour !' : 'Créer un compte'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? 'Connectez-vous pour continuer' : 'Rejoignez la communauté Gbaigbance'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="glass-ios space-y-4 p-4 sm:p-5" noValidate>
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="mb-1.5 block text-sm font-semibold text-[#17131D] dark:text-gray-200">
                {t('auth', 'name')}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'auth-name-error' : undefined}
                  className={`${fieldClass(Boolean(errors.name))} pr-4`}
                  placeholder="Koffi Mensah"
                />
              </div>
              {errors.name && (
                <p id="auth-name-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-300">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {errors.name}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-semibold text-[#17131D] dark:text-gray-200">
              {t('auth', 'email')}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                id="auth-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'auth-email-error' : undefined}
                className={`${fieldClass(Boolean(errors.email))} pr-4`}
                placeholder="vous@exemple.com"
              />
            </div>
            {errors.email && (
              <p id="auth-email-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-300">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-sm font-semibold text-[#17131D] dark:text-gray-200">
              {t('auth', 'password')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'auth-password-error' : undefined}
                className={`${fieldClass(Boolean(errors.password))} pr-14`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p id="auth-password-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-300">
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {errors.password}
              </p>
            )}
          </div>

          {mode === 'signup' && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-[#17131D] dark:text-gray-200">
                {t('auth', 'role')}
              </legend>
              <div role="radiogroup" aria-label={t('auth', 'role')} className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
                {roles.map((r) => {
                  const selected = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setRole(r.value)}
                      className={`flex min-h-11 w-full items-center justify-center rounded-2xl px-3 py-2.5 text-center text-sm font-semibold leading-tight transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                        selected
                          ? 'bg-[#6600FF] text-white shadow-purple'
                          : 'border border-black/[0.08] bg-white text-gray-700 hover:bg-[#F5F0FF] dark:border-white/[0.12] dark:bg-[#14121E] dark:text-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {t('auth', r.labelKey)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onForgotPassword}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-[#6600FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:text-[#A78BFA] dark:focus-visible:ring-offset-[#14121E]"
              >
                {t('auth', 'forgotPassword')}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="btn-purple mt-2 flex min-h-11 w-full items-center justify-center py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 disabled:opacity-60 motion-reduce:transition-none dark:focus-visible:ring-offset-[#14121E]"
          >
            {loading ? t('common', 'loading') : (mode === 'login' ? t('auth', 'login') : t('auth', 'signup'))}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {mode === 'login' ? t('auth', 'noAccount') : t('auth', 'haveAccount')}
          </span>
          <button
            type="button"
            onClick={onToggleMode}
            className="inline-flex min-h-11 items-center font-semibold text-[#6600FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:text-[#A78BFA] dark:focus-visible:ring-offset-[#14121E]"
          >
            {mode === 'login' ? t('auth', 'signUpCta') : t('auth', 'loginCta')}
          </button>
        </div>
        <div className="mt-1 text-center">
          <button
            type="button"
            onClick={onSuccess}
            className="inline-flex min-h-11 items-center text-sm font-medium text-gray-500 transition-colors hover:text-[#6600FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 motion-reduce:transition-none dark:text-gray-400 dark:hover:text-[#A78BFA] dark:focus-visible:ring-offset-[#14121E]"
          >
            Explorer en tant qu'invité →
          </button>
        </div>
      </div>
    </div>
  );
}
