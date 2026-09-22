import React from 'react';
import { Ticket as TicketIcon } from 'lucide-react';

interface UnauthorizedCreateGateProps {
  onBack: () => void;
}

export const UnauthorizedCreateGate: React.FC<UnauthorizedCreateGateProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[#6600FF] mb-4">
        <TicketIcon className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-[#17131D] dark:text-white mb-2">
        Espace Créateur Réservé
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        La publication d'événements est réservée aux comptes Organisateurs et Artistes vérifiés.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="btn-purple px-6 py-2.5 text-xs font-bold cursor-pointer"
      >
        Retour
      </button>
    </div>
  );
};
