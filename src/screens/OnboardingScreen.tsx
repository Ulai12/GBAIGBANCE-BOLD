import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Heart,
  MapPin,
  Music2,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';

interface OnboardingScreenProps {
  onComplete: () => void;
}

type Slide = {
  id: number;
  icon: typeof CalendarDays;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  secondary: string;
};

const slides: Slide[] = [
  {
    id: 0,
    icon: CalendarDays,
    eyebrow: 'EXPLORE',
    title: 'Les bons moments commencent ici.',
    description:
      'Découvre les événements qui font vibrer le Togo, le Bénin et toute l’Afrique francophone.',
    accent: '#6600FF',
    secondary: '#A78BFA',
  },
  {
    id: 1,
    icon: Music2,
    eyebrow: 'FOLLOW',
    title: 'Ne rate plus ce que tu aimes.',
    description:
      'Suis tes artistes, retrouve leurs prochaines dates et garde tes événements préférés à portée de main.',
    accent: '#7C3AED',
    secondary: '#C4B5FD',
  },
  {
    id: 2,
    icon: Sparkles,
    eyebrow: 'CREATE',
    title: 'Ton événement. Ton expérience.',
    description:
      'Crée, organise et partage tes événements avec une expérience pensée pour rester simple et élégante.',
    accent: '#5500D4',
    secondary: '#8B5CF6',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useApp();

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const startXRef = useRef<number | null>(null);
  const dragRef = useRef(false);

  const slide = slides[current];
  const Icon = slide.icon;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (isTransitioning || nextIndex === current) return;
      if (nextIndex < 0 || nextIndex >= slides.length) return;

      setDirection(nextIndex > current ? 'next' : 'prev');
      setIsTransitioning(true);

      window.setTimeout(() => {
        setCurrent(nextIndex);
        window.setTimeout(() => {
          setIsTransitioning(false);
        }, 30);
      }, 220);
    },
    [current, isTransitioning],
  );

  const handleNext = useCallback(() => {
    if (current < slides.length - 1) {
      goTo(current + 1);
      return;
    }

    onComplete();
  }, [current, goTo, onComplete]);

  const handleBack = useCallback(() => {
    if (current > 0) {
      goTo(current - 1);
    }
  }, [current, goTo]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') handleNext();
      if (event.key === 'ArrowLeft') handleBack();
      if (event.key === 'Escape') onComplete();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack, handleNext, onComplete]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX;
    dragRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || startXRef.current === null) return;

    const rawOffset = event.clientX - startXRef.current;
    const resistance = 0.45;

    setDragOffset(Math.max(-110, Math.min(110, rawOffset * resistance)));
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;

    const threshold = 55;

    if (dragOffset < -threshold && current < slides.length - 1) {
      handleNext();
    } else if (dragOffset > threshold && current > 0) {
      handleBack();
    }

    startXRef.current = null;
    dragRef.current = false;
    setDragOffset(0);
  };

  const transitionClass =
    direction === 'next'
      ? 'onboarding-enter-next'
      : 'onboarding-enter-prev';

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <style>
        {`
          .onboarding-shell {
            position: relative;
            width: 100%;
            min-height: 100dvh;
            isolation: isolate;
            overflow: hidden;
          }

          .onboarding-noise {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0.22;
            z-index: 0;
            background-image:
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.72) 0 1px, transparent 1px),
              radial-gradient(circle at 80% 70%, rgba(255,255,255,0.55) 0 1px, transparent 1px);
            background-size: 24px 24px, 28px 28px;
            mask-image: linear-gradient(
              to bottom,
              black 0%,
              rgba(0,0,0,0.35) 55%,
              transparent 100%
            );
          }

          .onboarding-ambient {
            position: absolute;
            border-radius: 999px;
            pointer-events: none;
            filter: blur(34px);
            opacity: 0.48;
            z-index: 0;
            animation: onboardingAmbient 8s ease-in-out infinite alternate;
            will-change: transform;
          }

          .onboarding-ambient.a {
            width: 260px;
            height: 260px;
            top: -80px;
            left: -70px;
            background: rgba(167, 139, 250, 0.38);
          }

          .onboarding-ambient.b {
            width: 300px;
            height: 300px;
            right: -100px;
            bottom: 110px;
            background: rgba(124, 58, 237, 0.24);
            animation-delay: -2s;
          }

          .onboarding-ambient.c {
            width: 170px;
            height: 170px;
            left: 40%;
            top: 36%;
            background: rgba(255,255,255,0.55);
            animation-delay: -4s;
          }

          .onboarding-topbar {
            position: relative;
            z-index: 30;
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding:
              max(16px, env(safe-area-inset-top))
              20px
              0;
          }

          .onboarding-nav-button {
            width: 44px;
            height: 44px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--text);
            background: rgba(255,255,255,0.48);
            border: 1px solid rgba(255,255,255,0.64);
            box-shadow:
              0 12px 30px rgba(76,29,149,0.08),
              inset 0 1px 0 rgba(255,255,255,0.82);
            backdrop-filter: blur(20px) saturate(1.2);
            -webkit-backdrop-filter: blur(20px) saturate(1.2);
            transition:
              transform 180ms cubic-bezier(.22,1,.36,1),
              background 180ms ease,
              opacity 180ms ease;
          }

          .onboarding-nav-button:active {
            transform: scale(0.92);
          }

          .onboarding-skip {
            appearance: none;
            border: 0;
            background: transparent;
            color: var(--text-muted);
            font-family: inherit;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: -0.01em;
            padding: 10px 4px;
            transition: opacity 160ms ease, color 160ms ease;
          }

          .onboarding-skip:active {
            opacity: 0.55;
          }

          .onboarding-content {
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: calc(100dvh - 82px);
            padding:
              24px
              24px
              max(130px, calc(env(safe-area-inset-bottom) + 108px));
            touch-action: pan-y;
          }

          .onboarding-scene {
            position: relative;
            width: min(88vw, 380px);
            height: min(88vw, 380px);
            max-height: 44dvh;
            min-height: 280px;
            margin-bottom: 22px;
            perspective: 1100px;
            transform-style: preserve-3d;
          }

          .scene-tilt {
            position: absolute;
            inset: 0;
            transform-style: preserve-3d;
            animation: sceneFloat 7s ease-in-out infinite;
            will-change: transform;
          }

          .scene-orbit {
            position: absolute;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.56);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.75),
              0 20px 60px rgba(76,29,149,0.06);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transform-style: preserve-3d;
            animation: orbitSpin 14s linear infinite;
          }

          .scene-orbit.one {
            width: 78%;
            height: 46%;
            left: 11%;
            top: 27%;
            transform: rotate(-17deg) translateZ(20px);
          }

          .scene-orbit.two {
            width: 58%;
            height: 75%;
            left: 21%;
            top: 12%;
            transform: rotate(21deg) translateZ(30px);
            animation-direction: reverse;
            animation-duration: 18s;
          }

          .scene-orbit.three {
            width: 31%;
            height: 31%;
            right: 2%;
            top: 7%;
            border-color: rgba(255,255,255,0.68);
            animation-duration: 10s;
          }

          .scene-glass-card {
            position: absolute;
            left: 11%;
            top: 20%;
            width: 78%;
            height: 60%;
            border-radius: 34px;
            padding: 18px;
            overflow: hidden;
            background:
              linear-gradient(
                145deg,
                rgba(255,255,255,0.72),
                rgba(255,255,255,0.28)
              );
            border: 1px solid rgba(255,255,255,0.74);
            box-shadow:
              0 34px 74px rgba(76,29,149,0.16),
              0 8px 24px rgba(76,29,149,0.08),
              inset 0 1px 0 rgba(255,255,255,0.94),
              inset 0 -18px 34px rgba(124,58,237,0.06);
            backdrop-filter: blur(24px) saturate(1.18);
            -webkit-backdrop-filter: blur(24px) saturate(1.18);
            transform:
              translateZ(110px)
              rotateX(5deg)
              rotateY(-8deg)
              rotateZ(-2deg);
            transform-style: preserve-3d;
            animation: cardFloat 6s ease-in-out infinite;
          }

          .scene-glass-card::before {
            content: '';
            position: absolute;
            width: 160%;
            height: 44%;
            left: -30%;
            top: -18%;
            border-radius: 999px;
            background:
              linear-gradient(
                120deg,
                transparent 0%,
                rgba(255,255,255,0.84) 45%,
                transparent 62%
              );
            transform: rotate(-12deg);
            opacity: 0.42;
            pointer-events: none;
            animation: glassSheen 6s ease-in-out infinite;
          }

          .scene-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            z-index: 2;
          }

          .scene-mini-icon {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            box-shadow:
              0 10px 20px rgba(102,0,255,0.20),
              inset 0 1px 0 rgba(255,255,255,0.40);
            transform: translateZ(34px);
          }

          .scene-like {
            width: 38px;
            height: 38px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.56);
            border: 1px solid rgba(255,255,255,0.70);
            color: var(--purple);
            box-shadow: 0 8px 18px rgba(76,29,149,0.08);
            transform: translateZ(24px);
          }

          .scene-lines {
            position: relative;
            z-index: 2;
            margin-top: 34px;
            display: grid;
            gap: 11px;
            transform: translateZ(28px);
          }

          .scene-line {
            height: 11px;
            border-radius: 999px;
            background: rgba(102,0,255,0.10);
            overflow: hidden;
          }

          .scene-line::after {
            content: '';
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(
              90deg,
              rgba(102,0,255,0.72),
              rgba(167,139,250,0.34)
            );
          }

          .scene-line.short::after { width: 40%; }
          .scene-line.medium::after { width: 66%; }
          .scene-line.long::after { width: 86%; }

          .scene-date-pill {
            position: absolute;
            left: -4%;
            bottom: 15%;
            z-index: 7;
            min-width: 112px;
            padding: 12px 14px;
            border-radius: 20px;
            background: rgba(255,255,255,0.78);
            border: 1px solid rgba(255,255,255,0.84);
            box-shadow:
              0 20px 38px rgba(76,29,149,0.14),
              inset 0 1px 0 rgba(255,255,255,0.9);
            backdrop-filter: blur(22px) saturate(1.18);
            -webkit-backdrop-filter: blur(22px) saturate(1.18);
            transform: translateZ(170px) rotate(-7deg);
            animation: badgeFloat 5s ease-in-out infinite;
          }

          .scene-date-label {
            display: block;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 2px;
          }

          .scene-date-value {
            display: block;
            font-size: 17px;
            font-weight: 800;
            color: var(--text);
            letter-spacing: -0.035em;
          }

          .scene-ticket {
            position: absolute;
            right: -2%;
            bottom: 10%;
            z-index: 8;
            width: 118px;
            height: 64px;
            border-radius: 22px;
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 11px;
            color: #fff;
            background: linear-gradient(
              145deg,
              var(--slide-accent),
              var(--slide-secondary)
            );
            border: 1px solid rgba(255,255,255,0.38);
            box-shadow:
              0 24px 44px rgba(102,0,255,0.24),
              inset 0 1px 0 rgba(255,255,255,0.34);
            transform:
              translateZ(180px)
              rotate(6deg);
            animation: ticketFloat 5.8s ease-in-out infinite;
          }

          .scene-ticket-icon {
            width: 32px;
            height: 32px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.16);
            border: 1px solid rgba(255,255,255,0.20);
          }

          .scene-ticket-copy {
            min-width: 0;
          }

          .scene-ticket-small {
            display: block;
            font-size: 8px;
            opacity: 0.72;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .scene-ticket-large {
            display: block;
            font-size: 13px;
            line-height: 1.1;
            font-weight: 800;
            white-space: nowrap;
          }

          .scene-heart {
            position: absolute;
            right: 12%;
            top: 3%;
            z-index: 9;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 18px;
            background: rgba(255,255,255,0.72);
            color: var(--purple);
            border: 1px solid rgba(255,255,255,0.80);
            box-shadow:
              0 18px 34px rgba(76,29,149,0.13),
              inset 0 1px 0 rgba(255,255,255,0.92);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            transform: translateZ(160px) rotate(7deg);
            animation: heartFloat 4.8s ease-in-out infinite;
          }

          .scene-persons {
            position: absolute;
            left: 2%;
            top: 8%;
            z-index: 8;
            display: flex;
            align-items: center;
            padding: 8px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.58);
            border: 1px solid rgba(255,255,255,0.72);
            box-shadow:
              0 16px 30px rgba(76,29,149,0.10),
              inset 0 1px 0 rgba(255,255,255,0.88);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            transform: translateZ(120px) rotate(-4deg);
          }

          .person-dot {
            width: 24px;
            height: 24px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: -5px;
            background:
              linear-gradient(
                145deg,
                rgba(102,0,255,0.84),
                rgba(167,139,250,0.54)
              );
            border: 2px solid rgba(255,255,255,0.90);
            color: #fff;
            box-shadow: 0 4px 10px rgba(76,29,149,0.10);
          }

          .person-dot:first-child {
            margin-left: 0;
          }

          .onboarding-copy {
            position: relative;
            z-index: 20;
            width: 100%;
            max-width: 560px;
            text-align: center;
          }

          .onboarding-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 13px;
            color: var(--purple);
            font-size: 11px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .onboarding-eyebrow::before {
            content: '';
            width: 18px;
            height: 1.5px;
            border-radius: 999px;
            background: currentColor;
            opacity: 0.55;
          }

          .onboarding-title {
            margin: 0 auto;
            max-width: 530px;
            color: var(--text);
            font-size: clamp(34px, 8vw, 58px);
            line-height: 0.98;
            letter-spacing: -0.055em;
            font-weight: 800;
            text-wrap: balance;
          }

          .onboarding-description {
            margin: 17px auto 0;
            max-width: 460px;
            color: var(--text-soft);
            font-size: 15px;
            line-height: 1.65;
            letter-spacing: -0.015em;
          }

          .onboarding-dots {
            position: absolute;
            left: 50%;
            bottom: max(96px, calc(env(safe-area-inset-bottom) + 78px));
            transform: translateX(-50%);
            z-index: 30;
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 7px 9px;
            border-radius: 999px;
            background: rgba(255,255,255,0.48);
            border: 1px solid rgba(255,255,255,0.62);
            box-shadow:
              0 12px 28px rgba(76,29,149,0.08),
              inset 0 1px 0 rgba(255,255,255,0.80);
            backdrop-filter: blur(18px) saturate(1.18);
            -webkit-backdrop-filter: blur(18px) saturate(1.18);
          }

          .onboarding-dot {
            height: 7px;
            width: 7px;
            border: 0;
            border-radius: 999px;
            padding: 0;
            background: rgba(102,0,255,0.18);
            transition:
              width 320ms cubic-bezier(.22,1,.36,1),
              background 240ms ease,
              transform 240ms ease;
          }

          .onboarding-dot.active {
            width: 26px;
            background: var(--purple);
          }

          .onboarding-footer {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 30;
            padding:
              0 20px
              max(20px, env(safe-area-inset-bottom));
          }

          .onboarding-next {
            width: 100%;
            max-width: 560px;
            min-height: 60px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border: 0;
            border-radius: 22px 22px 0 0;
            color: #fff;
            font-family: inherit;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: -0.02em;
            background:
              linear-gradient(
                145deg,
                var(--slide-accent),
                var(--slide-secondary)
              );
            box-shadow:
              0 -2px 20px rgba(76,29,149,0.08),
              0 18px 44px rgba(102,0,255,0.18),
              inset 0 1px 0 rgba(255,255,255,0.30);
            transition:
              transform 180ms cubic-bezier(.22,1,.36,1),
              filter 180ms ease;
          }

          .onboarding-next:active {
            transform: translateY(2px) scale(0.99);
            filter: brightness(0.96);
          }

          .onboarding-next-icon {
            width: 34px;
            height: 34px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.14);
            border: 1px solid rgba(255,255,255,0.18);
            transition: transform 200ms cubic-bezier(.22,1,.36,1);
          }

          .onboarding-next:hover .onboarding-next-icon {
            transform: translateX(3px);
          }

          .onboarding-back {
            position: absolute;
            left: 24px;
            bottom: max(102px, calc(env(safe-area-inset-bottom) + 84px));
            width: 44px;
            height: 44px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            z-index: 32;
            border: 1px solid rgba(255,255,255,0.62);
            background: rgba(255,255,255,0.44);
            color: var(--text);
            opacity: ${current === 0 ? 0 : 1};
            pointer-events: ${current === 0 ? 'none' : 'auto'};
            box-shadow:
              0 12px 28px rgba(76,29,149,0.08),
              inset 0 1px 0 rgba(255,255,255,0.84);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            transition:
              opacity 180ms ease,
              transform 180ms cubic-bezier(.22,1,.36,1);
          }

          .onboarding-back:active {
            transform: scale(0.93);
          }

          .onboarding-enter-next {
            animation:
              onboardingEnterNext 620ms cubic-bezier(.22,1,.36,1) both;
          }

          .onboarding-enter-prev {
            animation:
              onboardingEnterPrev 620ms cubic-bezier(.22,1,.36,1) both;
          }

          .transition-dim {
            opacity: ${isTransitioning ? 0.72 : 1};
            transform:
              translateX(${dragOffset}px)
              scale(${dragOffset === 0 ? 1 : 0.985});
            transition:
              transform ${dragOffset === 0 ? '380ms' : '0ms'}
                cubic-bezier(.22,1,.36,1),
              opacity 260ms ease;
          }

          @keyframes onboardingEnterNext {
            0% {
              opacity: 0;
              transform: translate3d(42px, 0, 0) scale(0.965);
              filter: blur(7px);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes onboardingEnterPrev {
            0% {
              opacity: 0;
              transform: translate3d(-42px, 0, 0) scale(0.965);
              filter: blur(7px);
            }
            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
              filter: blur(0);
            }
          }

          @keyframes sceneFloat {
            0%, 100% {
              transform: rotateX(0deg) rotateY(0deg) translateY(0px);
            }
            50% {
              transform: rotateX(5deg) rotateY(-4deg) translateY(-8px);
            }
          }

          @keyframes cardFloat {
            0%, 100% {
              transform:
                translateZ(110px)
                rotateX(5deg)
                rotateY(-8deg)
                rotateZ(-2deg)
                translateY(0);
            }
            50% {
              transform:
                translateZ(125px)
                rotateX(7deg)
                rotateY(-5deg)
                rotateZ(-1deg)
                translateY(-7px);
            }
          }

          @keyframes glassSheen {
            0%, 35% {
              transform: translateX(-18%) rotate(-12deg);
              opacity: 0;
            }
            52% {
              transform: translateX(42%) rotate(-12deg);
              opacity: 0.42;
            }
            74%, 100% {
              transform: translateX(95%) rotate(-12deg);
              opacity: 0;
            }
          }

          @keyframes badgeFloat {
            0%, 100% {
              transform:
                translateZ(170px)
                rotate(-7deg)
                translateY(0);
            }
            50% {
              transform:
                translateZ(188px)
                rotate(-5deg)
                translateY(-7px);
            }
          }

          @keyframes ticketFloat {
            0%, 100% {
              transform:
                translateZ(180px)
                rotate(6deg)
                translateY(0);
            }
            50% {
              transform:
                translateZ(198px)
                rotate(4deg)
                translateY(-8px);
            }
          }

          @keyframes heartFloat {
            0%, 100% {
              transform:
                translateZ(160px)
                rotate(7deg)
                translateY(0);
            }
            50% {
              transform:
                translateZ(175px)
                rotate(4deg)
                translateY(-8px);
            }
          }

          @keyframes orbitSpin {
            from {
              rotate: 0deg;
            }
            to {
              rotate: 360deg;
            }
          }

          @keyframes onboardingAmbient {
            0% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            100% {
              transform: translate3d(25px, -18px, 0) scale(1.08);
            }
          }

          @media (max-width: 480px) {
            .onboarding-content {
              padding-left: 18px;
              padding-right: 18px;
              padding-bottom:
                max(132px, calc(env(safe-area-inset-bottom) + 112px));
            }

            .onboarding-scene {
              width: min(94vw, 360px);
              height: min(94vw, 360px);
              min-height: 260px;
              margin-bottom: 12px;
            }

            .scene-glass-card {
              border-radius: 30px;
              left: 9%;
              width: 82%;
              height: 58%;
              top: 21%;
            }

            .scene-date-pill {
              left: 0;
              bottom: 12%;
              transform: translateZ(150px) rotate(-7deg) scale(0.92);
              transform-origin: left center;
            }

            .scene-ticket {
              right: 0;
              bottom: 8%;
              transform: translateZ(160px) rotate(6deg) scale(0.90);
              transform-origin: right center;
            }

            .scene-heart {
              right: 6%;
              transform: translateZ(145px) rotate(7deg) scale(0.92);
            }

            .scene-persons {
              left: 0;
              transform: translateZ(110px) rotate(-4deg) scale(0.9);
            }

            .onboarding-title {
              font-size: clamp(33px, 10vw, 45px);
              line-height: 1;
            }

            .onboarding-description {
              font-size: 14px;
              line-height: 1.58;
              max-width: 340px;
            }

            .onboarding-back {
              left: 18px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .scene-tilt,
            .scene-orbit,
            .scene-glass-card,
            .scene-date-pill,
            .scene-ticket,
            .scene-heart,
            .onboarding-ambient,
            .onboarding-enter-next,
            .onboarding-enter-prev {
              animation: none !important;
            }

            * {
              scroll-behavior: auto !important;
            }
          }
        `}
      </style>

      <div
        className="onboarding-shell"
        style={{
          ['--slide-accent' as string]: slide.accent,
          ['--slide-secondary' as string]: slide.secondary,
        }}
      >
        <div className="onboarding-noise" />
        <div className="onboarding-ambient a" />
        <div className="onboarding-ambient b" />
        <div className="onboarding-ambient c" />

        <header className="onboarding-topbar">
          <button
            type="button"
            onClick={handleBack}
            className="onboarding-nav-button"
            aria-label="Page précédente"
            disabled={current === 0}
            style={{
              opacity: current === 0 ? 0 : 1,
              pointerEvents: current === 0 ? 'none' : 'auto',
            }}
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={onComplete}
            className="onboarding-skip"
          >
            {t('common', 'skip')}
          </button>
        </header>

        <main
          className={`onboarding-content transition-dim`}
          aria-live="polite"
        >
          <div key={`scene-${current}`} className={transitionClass}>
            <div className="onboarding-scene">
              <div className="scene-tilt">
                <div className="scene-orbit one" />
                <div className="scene-orbit two" />
                <div className="scene-orbit three" />

                <div className="scene-persons">
                  <div className="person-dot">
                    <Users size={12} />
                  </div>
                  <div className="person-dot" />
                  <div className="person-dot" />
                  <div className="person-dot" />
                </div>

                <div className="scene-heart">
                  <Heart size={20} fill="currentColor" strokeWidth={1.8} />
                </div>

                <div className="scene-glass-card">
                  <div className="scene-card-top">
                    <div
                      className="scene-mini-icon"
                      style={{
                        background:
                          'linear-gradient(145deg, var(--slide-accent), var(--slide-secondary))',
                      }}
                    >
                      <Icon size={23} strokeWidth={1.9} />
                    </div>

                    <div className="scene-like">
                      {current === 0 ? (
                        <MapPin size={18} strokeWidth={2} />
                      ) : current === 1 ? (
                        <Heart
                          size={18}
                          fill="currentColor"
                          strokeWidth={2}
                        />
                      ) : (
                        <Sparkles size={18} strokeWidth={2} />
                      )}
                    </div>
                  </div>

                  <div className="scene-lines">
                    <div className="scene-line long" />
                    <div className="scene-line medium" />
                    <div className="scene-line short" />
                    <div className="scene-line medium" />
                  </div>
                </div>

                <div className="scene-date-pill">
                  <span className="scene-date-label">
                    {current === 0
                      ? 'À découvrir'
                      : current === 1
                        ? 'Prochaine date'
                        : 'Ton événement'}
                  </span>
                  <span className="scene-date-value">
                    {current === 0
                      ? 'Lomé · 12 km'
                      : current === 1
                        ? 'Samedi · 20h'
                        : 'Publie & partage'}
                  </span>
                </div>

                <div className="scene-ticket">
                  <div className="scene-ticket-icon">
                    {current === 0 ? (
                      <MapPin size={16} />
                    ) : current === 1 ? (
                      <Music2 size={16} />
                    ) : (
                      <Ticket size={16} />
                    )}
                  </div>

                  <div className="scene-ticket-copy">
                    <span className="scene-ticket-small">
                      {current === 0
                        ? 'Local'
                        : current === 1
                          ? 'Live'
                          : 'Organisateur'}
                    </span>
                    <span className="scene-ticket-large">
                      {current === 0
                        ? 'Près de toi'
                        : current === 1
                          ? 'À ne pas rater'
                          : 'Prêt à créer'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="onboarding-copy">
              <div className="onboarding-eyebrow">
                {slide.eyebrow}
              </div>

              <h1 className="onboarding-title">{slide.title}</h1>

              <p className="onboarding-description">{slide.description}</p>
            </div>
          </div>
        </main>

        <button
          type="button"
          onClick={handleBack}
          className="onboarding-back"
          aria-label="Retour"
        >
          <ChevronLeft size={19} strokeWidth={2.2} />
        </button>

        <div
          className="onboarding-dots"
          aria-label={`Étape ${current + 1} sur ${slides.length}`}
        >
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Aller à l'étape ${index + 1}`}
              aria-current={index === current ? 'step' : undefined}
              onClick={() => goTo(index)}
              className={`onboarding-dot ${
                index === current ? 'active' : ''
              }`}
            />
          ))}
        </div>

        <footer className="onboarding-footer">
          <button
            type="button"
            onClick={handleNext}
            className="onboarding-next"
          >
            <span>
              {current < slides.length - 1
                ? t('common', 'next')
                : t('common', 'getStarted')}
            </span>

            <span className="onboarding-next-icon">
              <ArrowRight size={17} strokeWidth={2.4} />
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}