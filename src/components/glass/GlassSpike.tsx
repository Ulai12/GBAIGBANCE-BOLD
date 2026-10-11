/**
 * GlassSpike.tsx
 * ---------------
 * Page de test (Spike) jetable pour valider Liquid Glass dans GBAIGBANCE.
 *
 * Objectifs du spike :
 *   1. Vérifier si l'accélération matérielle WebGPU s'active sur l'appareil réel.
 *   2. Tester si la réfraction s'applique correctement sur un décor HTML dynamique.
 *   3. Mesurer la fluidité tactile (interactive) et le comportement du repli CSS.
 *
 * Chargement : UNIQUEMENT à la demande via ?spike=1 pour ne pas alourdir le bundle principal.
 */

import { useEffect, useState } from 'react';
import { GlassBackdrop, GlassPanel, hasWebGPU } from './AdaptiveGlass';

// Couleur violette signature GBAIGBANCE
const ACCENT = '#6600FF';

/** Badge indicateur du matériel graphique */
function ModeBadge() {
  const [gpuStatus, setGpuStatus] = useState<string>('Détection du matériel...');

  useEffect(() => {
    (async () => {
      const available = await hasWebGPU();
      if (available) {
        setGpuStatus('🚀 WebGPU actif (Verre liquide matériel)');
      } else {
        const hasGpuObject = typeof navigator !== 'undefined' && 'gpu' in navigator;
        if (hasGpuObject) {
          setGpuStatus('⚠️ navigator.gpu présent mais adaptateur null -> Repli CSS');
        } else {
          setGpuStatus('🛡️ Pas de WebGPU -> Repli CSS Apple HIG');
        }
      }
    })();
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 50,
        padding: '8px 14px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: 'rgba(26, 26, 46, 0.85)',
        color: '#FFFFFF',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        pointerEvents: 'none',
      }}
    >
      {gpuStatus}
    </div>
  );
}

export default function GlassSpike() {
  return (
    <GlassBackdrop
      appearance="light"
      style={{ height: '100dvh', width: '100vw', overflow: 'hidden', position: 'relative' }}
      background={
        <div
          style={{
            height: '100%',
            width: '100%',
            background: 'linear-gradient(160deg, #E9E0FF 0%, #FFD6E8 50%, #FFE9C7 100%)',
            position: 'relative',
            fontFamily: 'Urbanist, -apple-system, system-ui, sans-serif',
            color: '#1A1A2E',
            userSelect: 'none',
          }}
        >
          {/* Sphères colorées vives pour tester la réfraction optique sous le verre */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '-8%',
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: ACCENT,
              opacity: 0.9,
              filter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '60%',
              right: '-10%',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: '#FF3D8B',
              opacity: 0.9,
              filter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '68%',
              left: '30%',
              width: 160,
              height: 160,
              borderRadius: 36,
              background: '#FFB020',
              opacity: 0.95,
            }}
          />

          {/* En-tête de démonstration */}
          <div style={{ padding: '80px 24px 16px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(102, 0, 255, 0.12)',
                color: ACCENT,
                marginBottom: 12,
              }}
            >
              Démonstrateur Spike ?spike=1
            </span>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, lineHeight: 1.15 }}>
              Concert Test — Lomé
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 16, opacity: 0.75, fontWeight: 600 }}>
              Samedi 18 h · Palais des Congrès
            </p>
          </div>
        </div>
      }
    >
      {/* 1. Badge d'état matériel WebGPU */}
      <ModeBadge />

      {/* 2. Barre CTA d'achat fixe teintée dans le violet GBAIGBANCE */}
      <GlassPanel
        radius="capsule"
        interactive
        tint={ACCENT}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 96,
          padding: '16px 24px',
          textAlign: 'center',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: 17,
          cursor: 'pointer',
        }}
      >
        Acheter un ticket
      </GlassPanel>

      {/* 3. Barre d'onglets de navigation inférieure flottante */}
      <GlassPanel
        radius="capsule"
        interactive
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 20,
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: '#1A1A2E',
        }}
      >
        <span>Accueil</span>
        <span>Explorer</span>
        <span>Billets</span>
        <span>Profil</span>
      </GlassPanel>
    </GlassBackdrop>
  );
}
