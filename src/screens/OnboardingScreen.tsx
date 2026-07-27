import { useState } from 'react';
import { Calendar, Music2, Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '@/hooks/useApp';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  { icon: Calendar, title: 'Découvrez les meilleurs événements', desc: 'Autour de vous, au Togo, au Bénin et dans toute l\'Afrique francophone', gradient: 'from-[#6600FF] to-[#A885FF]', bg: 'from-[#EDE8FF] to-[#C4B3FF]' },
  { icon: Music2, title: 'Suivez vos artistes préférés', desc: 'Restez informé de leurs prochaines dates et ne manquez aucun concert', gradient: 'from-[#5500D4] to-[#8B5CF6]', bg: 'from-[#DDD5FF] to-[#EDE8FF]' },
  { icon: Sparkles, title: 'Créez vos propres événements', desc: 'Organisez, gérez et vendez vos billets en toute simplicité', gradient: 'from-[#7C3AED] to-[#6600FF]', bg: 'from-[#EDE8FF] to-[#DDD5FF]' },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useApp();
  const [current, setCurrent] = useState(0);
  const handleNext = () => { if (current < slides.length - 1) setCurrent((prev) => prev + 1); else onComplete(); };
  const slide = slides[current];
  const Icon = slide.icon;
  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
      <div className="flex justify-end p-6"><button onClick={onComplete} className="text-sm font-medium text-gray-500 hover:text-[#1A1A2E] transition-colors">{t('common', 'skip')}</button></div>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div key={current} className={`w-40 h-40 rounded-[3rem] bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-12 shadow-2xl animate-scale-in`}><Icon className="w-20 h-20 text-white" strokeWidth={1.5} /></div>
        <h1 className="text-3xl font-extrabold text-center text-[#1A1A2E] mb-4 max-w-xs animate-slide-up">{slide.title}</h1>
        <p className="text-base text-center text-gray-600 max-w-sm leading-relaxed animate-slide-up">{slide.desc}</p>
      </div>
      <div className="flex items-center justify-center gap-2 pb-8">{slides.map((_, idx) => (<div key={idx} className={`h-2 rounded-full transition-all duration-300 ${idx === current ? 'w-8 bg-[#6600FF]' : 'w-2 bg-gray-300'}`} />))}</div>
      <div className="px-8 pb-12"><button onClick={handleNext} className="btn-purple w-full py-4 flex items-center justify-center gap-2">{current < slides.length - 1 ? t('common', 'next') : t('common', 'getStarted')}<ArrowRight className="w-5 h-5" /></button></div>
    </div>
  );
}
