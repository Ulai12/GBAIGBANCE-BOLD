import { useState, useEffect } from 'react';
import { Ticket as TicketIcon, QrCode, Calendar, MapPin, X } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { fetchUserTickets, cancelTicket } from '@/services/events';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import type { Event, Ticket } from '@/types';
import type { ToastData } from '@/components/Toast';

interface TicketsScreenProps { onEventClick: (event: Event) => void; onLogin: () => void; onToast: (toast: Omit<ToastData, 'id'>) => void; }

export function TicketsScreen({ onEventClick, onLogin, onToast }: TicketsScreenProps) {
  const { session, user } = useApp();
  const [tickets, setTickets] = useState<(Ticket & { event?: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  useEffect(() => { if (!user) { setLoading(false); return; } fetchUserTickets(user.id).then((data) => setTickets((data as (Ticket & { event?: Event })[]) || [])).catch(() => {}).finally(() => setLoading(false)); }, [user]);
  const handleCancel = async () => { if (!cancelTarget) return; setCancelling(true); try { const result = await cancelTicket(cancelTarget); if (result.success) { onToast({ message: 'Billet annulé', type: 'success' }); setTickets(tickets.map((t) => t.id === cancelTarget ? { ...t, status: 'cancelled' } : t)); } else { onToast({ message: result.error || 'Erreur', type: 'error' }); } } catch { onToast({ message: 'Erreur réseau', type: 'error' }); } finally { setCancelling(false); setCancelTarget(null); } };
  if (!session) { return (<div className="min-h-screen bg-lavender flex flex-col items-center justify-center px-6 pb-32"><div className="w-20 h-20 rounded-full bg-[#6600FF]/10 flex items-center justify-center mb-5"><TicketIcon className="w-10 h-10 text-[#6600FF]" /></div><h1 className="text-xl font-bold text-[#1A1A2E] mb-2">Vos billets</h1><p className="text-gray-500 text-center text-sm mb-6 max-w-xs">Connectez-vous pour voir vos billets et leurs QR codes d'entrée</p><button onClick={onLogin} className="btn-purple px-8 py-3">Se connecter</button></div>); }
  return (
    <div className="min-h-screen pb-32">
      <div className="px-5 pt-8 pb-3"><p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] font-bold">Votre agenda</p><h1 className="mt-1 text-3xl font-extrabold text-[#171726] tracking-tight">Mes billets</h1><p className="text-sm text-gray-500 mt-1">{tickets.filter((t) => t.status === 'active').length} billet{tickets.length > 1 ? 's' : ''} actif{tickets.length > 1 ? 's' : ''}</p></div>
      {loading ? (<div className="px-5 mt-6 space-y-4">{[1,2].map((i) => <div key={i} className="skeleton h-48 rounded-3xl" />)}</div>) : tickets.length === 0 ? (<div className="mt-10"><EmptyState title="Aucun billet" description="Vous n'avez pas encore de billets. Découvrez des événements et réservez votre place !" /></div>) : (
        <div className="px-5 mt-5 space-y-4">{tickets.map((ticket) => (
          <div key={ticket.id} className="glass-ticket rounded-[1.75rem] overflow-hidden animate-slide-up shadow-[0_18px_38px_rgba(76,29,149,0.14)]">
            <div className="p-5 flex items-start gap-4"><button onClick={() => ticket.event && onEventClick(ticket.event)} className="w-16 h-16 rounded-2xl overflow-hidden shrink-0"><img src={ticket.event?.cover_url || ''} alt="" className="w-full h-full object-cover" /></button><div className="flex-1 min-w-0"><h3 className="font-bold text-[#1A1A2E] line-clamp-1">{ticket.event?.title}</h3><div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600"><Calendar className="w-3.5 h-3.5" />{ticket.event ? new Date(ticket.event.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div><div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-600"><MapPin className="w-3.5 h-3.5" />{ticket.event?.location_name}</div></div><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ticket.status === 'active' ? 'bg-green-100 text-green-700' : ticket.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{ticket.status === 'active' ? 'Valide' : ticket.status === 'cancelled' ? 'Annulé' : ticket.status}</span></div>
            <div className="relative flex items-center"><div className="absolute left-0 w-5 h-5 rounded-full bg-[#EDE8FF] -ml-2.5" /><div className="flex-1 border-t-2 border-dashed border-white/50 mx-4" /><div className="absolute right-0 w-5 h-5 rounded-full bg-[#EDE8FF] -mr-2.5" /></div>
            <div className="p-5 flex items-center justify-between"><div><p className="text-xs text-gray-500 uppercase font-semibold">Type</p><p className="font-bold text-[#1A1A2E]">{ticket.ticket_type.toUpperCase()}</p>{ticket.qr_code && <p className="text-xs text-gray-500 mt-1 font-mono">{ticket.qr_code}</p>}</div><div className="flex items-center gap-2">{ticket.status === 'active' && (<><button onClick={() => setViewingTicket(ticket)} className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center hover:bg-white transition-all" title="Voir le QR code"><QrCode className="w-6 h-6 text-[#1A1A2E]" /></button><button onClick={() => setCancelTarget(ticket.id)} className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all" title="Annuler"><X className="w-5 h-5 text-red-500" /></button></>)}</div></div>
          </div>
        ))}</div>
      )}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Annuler le billet ?"><div className="space-y-4"><p className="text-sm text-gray-600">Êtes-vous sûr de vouloir annuler ce billet ? Cette action libérera votre place.</p><div className="flex gap-3"><button onClick={() => setCancelTarget(null)} className="flex-1 py-3 rounded-full bg-white text-gray-600 font-semibold">Non, garder</button><button onClick={handleCancel} disabled={cancelling} className="flex-1 py-3 rounded-full bg-red-500 text-white font-semibold">{cancelling ? 'Annulation...' : 'Oui, annuler'}</button></div></div></Modal>
      <Modal open={!!viewingTicket} onClose={() => setViewingTicket(null)} title="QR Code d'entrée">{viewingTicket && (<div className="flex flex-col items-center gap-4"><div className="w-48 h-48 rounded-3xl bg-white flex items-center justify-center shadow-lg"><QrCode className="w-32 h-32 text-[#1A1A2E]" /></div><div className="text-center"><p className="font-bold text-[#1A1A2E]">{viewingTicket.ticket_type.toUpperCase()}</p><p className="text-sm text-gray-500 font-mono mt-1">{viewingTicket.qr_code}</p></div><p className="text-xs text-gray-400 text-center max-w-xs">Présentez ce QR code à l'entrée de l'événement pour valider votre billet</p></div>)}</Modal>
    </div>
  );
}
