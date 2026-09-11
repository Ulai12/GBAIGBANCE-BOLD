import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Trash2, HelpCircle, Reply, BadgeCheck, Flame, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { UserAvatar } from '@/components/UserAvatar';
import {
  fetchEventComments, addEventComment, deleteEventComment,
  fetchEventReactions, toggleEventReaction,
  fetchEventQuestions, addEventQuestion, answerEventQuestion,
} from '@/services/events';
import type { Event, EventComment, EventReaction, EventQuestion, PublicProfile } from '@/types';

const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🎉', '😮', '🎵'];

type Tab = 'comments' | 'reactions' | 'qa';

interface EventInteractionPanelProps {
  event: Event;
  isOrganizer: boolean;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export function EventInteractionPanel({ event, isOrganizer, onToast }: EventInteractionPanelProps) {
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>('comments');
  const [comments, setComments] = useState<EventComment[]>([]);
  const [reactions, setReactions] = useState<EventReaction[]>([]);
  const [questions, setQuestions] = useState<(EventQuestion & { profile?: PublicProfile; answerer?: PublicProfile })[]>([]);
  const [commentText, setCommentText] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const loadComments = useCallback(() => {
    fetchEventComments(event.id).then(setComments).catch((err) => console.error('comments', err));
  }, [event.id]);

  const loadReactions = useCallback(() => {
    fetchEventReactions(event.id).then(setReactions).catch((err) => console.error('reactions', err));
  }, [event.id]);

  const loadQuestions = useCallback(() => {
    fetchEventQuestions(event.id).then(setQuestions).catch((err) => console.error('questions', err));
  }, [event.id]);

  useEffect(() => {
    loadComments();
    loadReactions();
    loadQuestions();
  }, [loadComments, loadReactions, loadQuestions]);

  const handleAddComment = async () => {
    if (!user || !commentText.trim() || submittingComment) return;
    const text = commentText.trim();
    setSubmittingComment(true);
    const optimistic: EventComment = {
      id: `temp-${Date.now()}`,
      event_id: event.id,
      user_id: user.id,
      parent_id: null,
      body: text,
      is_organizer_reply: isOrganizer,
      created_at: new Date().toISOString(),
      profile: { id: user.id, name: user.name, avatar_url: user.avatar_url, role: user.role },
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentText('');
    try {
      await addEventComment(event.id, user.id, text, isOrganizer);
      loadComments();
    } catch (err) {
      console.error('addEventComment error:', err);
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setCommentText(text);
      onToast({ message: 'Impossible d\'envoyer le commentaire', type: 'error' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteEventComment(id);
    } catch (err) {
      console.error('deleteEventComment error:', err);
      loadComments();
      onToast({ message: 'Suppression impossible', type: 'error' });
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) { onToast({ message: 'Connectez-vous pour réagir', type: 'info' }); return; }
    try {
      await toggleEventReaction(event.id, user.id, emoji);
      loadReactions();
    } catch (err) {
      console.error('toggleEventReaction error:', err);
      onToast({ message: 'Erreur', type: 'error' });
    }
  };

  const handleAskQuestion = async () => {
    if (!user || !questionText.trim() || submittingQuestion) return;
    const text = questionText.trim();
    setSubmittingQuestion(true);
    const optimistic: EventQuestion & { profile?: PublicProfile } = {
      id: `temp-${Date.now()}`,
      event_id: event.id,
      user_id: user.id,
      question: text,
      answer: null,
      answered_by: null,
      answered_at: null,
      created_at: new Date().toISOString(),
      profile: { id: user.id, name: user.name, avatar_url: user.avatar_url, role: user.role },
    };
    setQuestions((prev) => [...prev, optimistic]);
    setQuestionText('');
    try {
      await addEventQuestion(event.id, user.id, text);
      loadQuestions();
      onToast({ message: 'Question posée !', type: 'success' });
    } catch (err) {
      console.error('addEventQuestion error:', err);
      setQuestions((prev) => prev.filter((q) => q.id !== optimistic.id));
      setQuestionText(text);
      onToast({ message: 'Impossible d\'envoyer la question', type: 'error' });
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleAnswer = async (questionId: string) => {
    if (!user || !answerDraft.trim() || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      await answerEventQuestion(questionId, answerDraft.trim(), user.id);
      setAnsweringId(null);
      setAnswerDraft('');
      loadQuestions();
      onToast({ message: 'Réponse publiée !', type: 'success' });
    } catch (err) {
      console.error('answerEventQuestion error:', err);
      onToast({ message: 'Impossible de publier la réponse', type: 'error' });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const reactionCounts = REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: reactions.filter((r) => r.emoji === emoji).length,
    mine: user ? reactions.some((r) => r.emoji === emoji && r.user_id === user.id) : false,
  }));

  const totalReactions = reactions.length;

  return (
    <div className="mt-6">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-4">
        {[
          { id: 'comments' as Tab, label: 'Commentaires', icon: MessageCircle, count: comments.length },
          { id: 'reactions' as Tab, label: 'Réactions', icon: Flame, count: totalReactions },
          { id: 'qa' as Tab, label: 'Q & R', icon: HelpCircle, count: questions.length },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive ? 'bg-white shadow-sm text-[#6600FF] scale-105' : 'text-gray-500'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-[#6600FF]/10' : 'bg-gray-200'}`}>{t.count}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'comments' && (
        <div className="animate-fade-in">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Soyez le premier à commenter !</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.07] mb-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-white/45">
              {comments.map((c) => (
                <div key={c.id} className={`flex gap-3 p-4 transition-opacity ${c.id.startsWith('temp-') ? 'opacity-60' : 'opacity-100'} ${c.is_organizer_reply ? 'bg-[#6600FF]/[0.04]' : ''}`}>
                  <UserAvatar
                    src={c.profile?.avatar_url}
                    name={c.profile?.name || 'Anonyme'}
                    role={c.is_organizer_reply ? 'organizer' : 'attendee'}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#1A1A2E]">{c.profile?.name || 'Anonyme'}</span>
                      <span className="text-xs text-gray-400">· {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      {c.is_organizer_reply && <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#6600FF] bg-[#6600FF]/10 px-1.5 py-0.5 rounded-full"><BadgeCheck className="w-3 h-3" /> Organisateur</span>}
                      {!c.id.startsWith('temp-') && (c.user_id === user?.id || isOrganizer) && <button onClick={() => handleDeleteComment(c.id)} className="ml-auto text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700 mt-1 break-words">{c.body}</p>
                    <div className="mt-3 flex items-center gap-5 text-xs text-gray-400"><span>Discussion</span>{c.is_organizer_reply && <span className="text-[#6600FF]">Réponse officielle</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {user ? (
            <div className="flex gap-2 items-end rounded-2xl border border-black/[0.07] bg-white/60 p-2">
              <UserAvatar
                src={user.avatar_url}
                name={user.name}
                role={user.role}
                size="sm"
                className="shrink-0"
              />
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} placeholder="Ajouter un commentaire..." className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 resize-none min-h-[44px] max-h-24" rows={1} />
              <button onClick={handleAddComment} disabled={!commentText.trim() || submittingComment} className="w-11 h-11 rounded-full bg-[#6600FF] flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform shrink-0"><Send className="w-4 h-4" /></button>
            </div>
          ) : <p className="text-center text-sm text-gray-400 py-3">Connectez-vous pour commenter</p>}
        </div>
      )}

      {tab === 'reactions' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            {reactionCounts.map(({ emoji, count, mine }) => (
              <button key={emoji} onClick={() => handleReaction(emoji)} className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all active:scale-90 ${mine ? 'border-[#6600FF] bg-[#6600FF]/5 scale-105' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                <span className={`text-3xl transition-transform ${mine ? 'scale-110' : ''}`}>{emoji}</span>
                <span className="text-sm font-bold text-[#1A1A2E]">{count}</span>
              </button>
            ))}
          </div>
          {!user && <p className="text-center text-sm text-gray-400 mt-4">Connectez-vous pour réagir</p>}
        </div>
      )}

      {tab === 'qa' && (
        <div className="animate-fade-in">
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500">Aucune question pour le moment</p>
              <p className="text-xs text-gray-400 mt-1">Posez la première question à l'organisateur</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {questions.map((q) => (
                <div key={q.id} className={`rounded-2xl overflow-hidden transition-opacity ${q.id.startsWith('temp-') ? 'opacity-60' : 'opacity-100'} ${q.answer ? 'bg-white' : 'bg-amber-50'}`}>
                  <div className="flex gap-3 p-4">
                    <UserAvatar
                      src={q.profile?.avatar_url}
                      name={q.profile?.name || 'Anonyme'}
                      role="attendee"
                      size="xs"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-[#1A1A2E]">{q.profile?.name || 'Anonyme'}</span>
                        {q.answer ? <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Répondu</span> : <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">En attente</span>}
                        <span className="text-[10px] text-gray-400 ml-auto">{new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-1.5 font-medium">{q.question}</p>
                    </div>
                  </div>
                  {q.answer && (
                    <div className="mx-4 mb-4 pl-3 border-l-2 border-[#6600FF]/30 bg-[#6600FF]/5 rounded-r-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1"><Reply className="w-3.5 h-3.5 text-[#6600FF]" /><span className="text-xs font-bold text-[#6600FF]">{q.answerer?.name || 'Organisateur'}</span></div>
                      <p className="text-sm text-gray-700">{q.answer}</p>
                    </div>
                  )}
                  {isOrganizer && !q.answer && !q.id.startsWith('temp-') && (
                    <div className="px-4 pb-4">
                      {answeringId === q.id ? (
                        <div className="flex gap-2 items-center">
                          <input type="text" autoFocus placeholder="Votre réponse..." value={answerDraft} onChange={(e) => setAnswerDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAnswer(q.id); if (e.key === 'Escape') { setAnsweringId(null); setAnswerDraft(''); } }} className="flex-1 px-3 py-2 bg-white rounded-xl text-sm border border-[#6600FF]/30 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" />
                          <button onClick={() => handleAnswer(q.id)} disabled={submittingAnswer || !answerDraft.trim()} className="px-3 py-2 bg-[#6600FF] text-white text-xs font-bold rounded-xl disabled:opacity-40 active:scale-90 transition-transform shrink-0">Publier</button>
                          <button onClick={() => { setAnsweringId(null); setAnswerDraft(''); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setAnsweringId(q.id); setAnswerDraft(''); }} className="flex items-center gap-1.5 text-xs font-semibold text-[#6600FF] hover:underline"><Reply className="w-3.5 h-3.5" /> Répondre à cette question</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {user ? (
            <div className="flex gap-2 items-center">
              <UserAvatar
                src={user.avatar_url}
                name={user.name}
                role={user.role}
                size="sm"
                className="shrink-0"
              />
              <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAskQuestion(); }} placeholder="Posez une question à l'organisateur..." className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40" />
              <button onClick={handleAskQuestion} disabled={!questionText.trim() || submittingQuestion} className="w-11 h-11 rounded-full bg-[#6600FF] flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform shrink-0"><Send className="w-4 h-4" /></button>
            </div>
          ) : <p className="text-center text-sm text-gray-400 py-3">Connectez-vous pour poser une question</p>}
        </div>
      )}
    </div>
  );
}
