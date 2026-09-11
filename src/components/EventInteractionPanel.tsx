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
      {/* Segmented Tab Bar iOS */}
      <div className="flex gap-1 p-1 bg-black/[0.05] dark:bg-white/[0.08] backdrop-blur-md rounded-2xl mb-4 border border-black/[0.04] dark:border-white/[0.06]">
        {[
          { id: 'comments' as Tab, label: 'Commentaires', icon: MessageCircle, count: comments.length },
          { id: 'reactions' as Tab, label: 'Réactions', icon: Flame, count: totalReactions },
          { id: 'qa' as Tab, label: 'Q & R', icon: HelpCircle, count: questions.length },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#6600FF] shadow-sm text-[#17131D] dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-[#6600FF]/10 dark:bg-white/20' : 'bg-black/5 dark:bg-white/10'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'comments' && (
        <div className="animate-fade-in">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Soyez le premier à commenter !</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] mb-4 overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04]">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`flex gap-3 p-4 transition-opacity ${
                    c.id.startsWith('temp-') ? 'opacity-60' : 'opacity-100'
                  } ${c.is_organizer_reply ? 'bg-[#6600FF]/[0.05] dark:bg-[#6600FF]/15' : ''}`}
                >
                  <UserAvatar
                    src={c.profile?.avatar_url}
                    name={c.profile?.name || 'Anonyme'}
                    role={c.is_organizer_reply ? 'organizer' : 'attendee'}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-[#17131D] dark:text-white">
                        {c.profile?.name || 'Anonyme'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        · {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      {c.is_organizer_reply && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#6600FF] dark:text-purple-300 bg-[#6600FF]/10 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
                          <BadgeCheck className="w-3 h-3" /> Organisateur
                        </span>
                      )}
                      {!c.id.startsWith('temp-') && (c.user_id === user?.id || isOrganizer) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                          aria-label="Supprimer le commentaire"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mt-1 break-words">
                      {c.body}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span>Discussion</span>
                      {c.is_organizer_reply && (
                        <span className="text-[#6600FF] dark:text-purple-300 font-medium">Réponse officielle</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {user ? (
            <div className="flex gap-2 items-end rounded-2xl border border-black/[0.07] dark:border-white/10 bg-white/80 dark:bg-white/[0.05] p-2.5 shadow-xs">
              <UserAvatar
                src={user.avatar_url}
                name={user.name}
                role={user.role}
                size="sm"
                className="shrink-0 mb-1"
              />
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Ajouter un commentaire..."
                className="flex-1 px-3.5 py-2.5 bg-gray-100 dark:bg-white/[0.07] rounded-xl text-sm text-[#17131D] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40 resize-none min-h-[42px] max-h-24"
                rows={1}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
                className="w-10 h-10 rounded-full bg-[#6600FF] hover:bg-[#5200cc] flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform shrink-0 cursor-pointer shadow-sm shadow-[#6600FF]/30"
                aria-label="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-3 font-medium">
              Connectez-vous pour commenter
            </p>
          )}
        </div>
      )}

      {tab === 'reactions' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            {reactionCounts.map(({ emoji, count, mine }) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${
                  mine
                    ? 'border-[#6600FF] bg-[#6600FF]/10 dark:bg-[#6600FF]/20 shadow-xs'
                    : 'border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:border-black/15 dark:hover:border-white/20'
                }`}
              >
                <span className={`text-3xl transition-transform ${mine ? 'scale-110' : ''}`}>{emoji}</span>
                <span className="text-sm font-black text-[#17131D] dark:text-white">{count}</span>
              </button>
            ))}
          </div>
          {!user && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4 font-medium">
              Connectez-vous pour réagir
            </p>
          )}
        </div>
      )}

      {tab === 'qa' && (
        <div className="animate-fade-in">
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Aucune question pour le moment</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Posez la première question à l'organisateur</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-2xl overflow-hidden border transition-opacity ${
                    q.id.startsWith('temp-') ? 'opacity-60' : 'opacity-100'
                  } ${
                    q.answer
                      ? 'bg-white dark:bg-white/[0.04] border-black/5 dark:border-white/10'
                      : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-500/20'
                  }`}
                >
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
                        <span className="text-sm font-bold text-[#17131D] dark:text-white">
                          {q.profile?.name || 'Anonyme'}
                        </span>
                        {q.answer ? (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Répondu
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                            En attente
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                          {new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1.5 font-medium">
                        {q.question}
                      </p>
                    </div>
                  </div>
                  {q.answer && (
                    <div className="mx-4 mb-4 pl-3.5 border-l-2 border-[#6600FF] dark:border-purple-400 bg-[#6600FF]/5 dark:bg-[#6600FF]/15 rounded-r-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Reply className="w-3.5 h-3.5 text-[#6600FF] dark:text-purple-300" />
                        <span className="text-xs font-bold text-[#6600FF] dark:text-purple-300">
                          {q.answerer?.name || 'Organisateur'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {q.answer}
                      </p>
                    </div>
                  )}
                  {isOrganizer && !q.answer && !q.id.startsWith('temp-') && (
                    <div className="px-4 pb-4">
                      {answeringId === q.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Votre réponse..."
                            value={answerDraft}
                            onChange={(e) => setAnswerDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAnswer(q.id);
                              if (e.key === 'Escape') {
                                setAnsweringId(null);
                                setAnswerDraft('');
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-white dark:bg-white/[0.08] text-[#17131D] dark:text-white rounded-xl text-sm border border-[#6600FF]/30 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40"
                          />
                          <button
                            onClick={() => handleAnswer(q.id)}
                            disabled={submittingAnswer || !answerDraft.trim()}
                            className="px-3.5 py-2 bg-[#6600FF] hover:bg-[#5200cc] text-white text-xs font-bold rounded-xl disabled:opacity-40 active:scale-90 transition-transform shrink-0 cursor-pointer"
                          >
                            Publier
                          </button>
                          <button
                            onClick={() => {
                              setAnsweringId(null);
                              setAnswerDraft('');
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAnsweringId(q.id);
                            setAnswerDraft('');
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#6600FF] dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          <Reply className="w-3.5 h-3.5" /> Répondre à cette question
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {user ? (
            <div className="flex gap-2 items-center rounded-2xl border border-black/[0.07] dark:border-white/10 bg-white/80 dark:bg-white/[0.05] p-2.5 shadow-xs">
              <UserAvatar
                src={user.avatar_url}
                name={user.name}
                role={user.role}
                size="sm"
                className="shrink-0"
              />
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskQuestion();
                }}
                placeholder="Posez une question à l'organisateur..."
                className="flex-1 px-3.5 py-2.5 bg-gray-100 dark:bg-white/[0.07] rounded-xl text-sm text-[#17131D] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/40"
              />
              <button
                onClick={handleAskQuestion}
                disabled={!questionText.trim() || submittingQuestion}
                className="w-10 h-10 rounded-full bg-[#6600FF] hover:bg-[#5200cc] flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition-transform shrink-0 cursor-pointer shadow-sm shadow-[#6600FF]/30"
                aria-label="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-3 font-medium">
              Connectez-vous pour poser une question
            </p>
          )}
        </div>
      )}
    </div>
  );
}
