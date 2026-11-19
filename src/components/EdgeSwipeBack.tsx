import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptic } from '@/hooks/useHaptics';
import { isRootTabPath, safeNavigateBack } from '@/utils/navigation';

const EDGE_THRESHOLD_PX = 28;
const SWIPE_SUCCESS_DISTANCE = 75;

/**
 * Gesture iOS edge-swipe back avec retour securise (pas de history vide).
 */
export function EdgeSwipeBack() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isReadyToRelease, setIsReadyToRelease] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const primedHapticTriggeredRef = useRef(false);
  const swipeDistanceRef = useRef(0);
  const isSwipingRef = useRef(false);

  const isEligibleScreen = !isRootTabPath(location.pathname);

  useEffect(() => {
    if (!isEligibleScreen) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];

      if (touch.clientX <= EDGE_THRESHOLD_PX) {
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        isTrackingRef.current = true;
        primedHapticTriggeredRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);

      if (!isSwipingRef.current && deltaY > deltaX && deltaY > 15) {
        isTrackingRef.current = false;
        return;
      }

      if (deltaX > 12 && deltaX > deltaY * 1.1) {
        isSwipingRef.current = true;
        setIsSwiping(true);
        const distance = Math.max(0, Math.min(deltaX, 130));
        swipeDistanceRef.current = distance;
        setSwipeDistance(distance);

        const ready = distance >= SWIPE_SUCCESS_DISTANCE;
        setIsReadyToRelease(ready);

        if (ready && !primedHapticTriggeredRef.current) {
          haptic.selection();
          primedHapticTriggeredRef.current = true;
        } else if (!ready && primedHapticTriggeredRef.current) {
          primedHapticTriggeredRef.current = false;
        }
      }
    };

    const handleTouchEnd = () => {
      if (isTrackingRef.current && isSwipingRef.current) {
        if (swipeDistanceRef.current >= SWIPE_SUCCESS_DISTANCE) {
          haptic.light();
          safeNavigateBack(navigate, { fallback: '/home' });
        }
      }
      isTrackingRef.current = false;
      isSwipingRef.current = false;
      swipeDistanceRef.current = 0;
      setIsSwiping(false);
      setSwipeDistance(0);
      setIsReadyToRelease(false);
      primedHapticTriggeredRef.current = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isEligibleScreen, navigate]);

  if (!isEligibleScreen) return null;

  return (
    <AnimatePresence>
      {isSwiping && (
        <div className="fixed inset-y-0 left-0 z-[80] pointer-events-none flex items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: Math.min(swipeDistance / 100, 0.4) }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/20 to-transparent"
          />

          <motion.div
            initial={{ x: -60, scale: 0.8, opacity: 0 }}
            animate={{
              x: Math.min(swipeDistance * 0.45, 45),
              scale: isReadyToRelease ? 1.12 : 1,
              opacity: Math.min(swipeDistance / 35, 1),
            }}
            exit={{ x: -60, scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className={`ml-2 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl shadow-2xl transition-colors duration-200 border ${
              isReadyToRelease
                ? 'bg-[#6600FF] border-[#8B5CF6] text-white shadow-[#6600FF]/40'
                : 'bg-white/90 dark:bg-[#1C1A29]/90 border-black/10 dark:border-white/15 text-[#1A1A2E] dark:text-white'
            }`}
          >
            <ChevronLeft
              className={`w-6 h-6 transition-transform duration-200 ${
                isReadyToRelease ? '-translate-x-0.5 scale-110' : ''
              }`}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
