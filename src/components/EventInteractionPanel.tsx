import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Trash2, HelpCircle, Reply, BadgeCheck, Flame, CheckCircle2, Lock } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { UserAvatar } from '@/components/UserAvatar';
import {
  fetchEventComments, addEventComment, deleteEventComment,
  fetchEventReactions, toggleEventReaction,
  fetchEventQuestions, addEventQuestion, answerEventQuestion,
} from '@/services/events';
import type { Event, EventComment, EventReaction, EventQuestion, PublicProfile } from '@/types';

/**
 * GBAIGBANCE — EventInteractionPanel (Onglets Liquid Glass iOS)
 * 
 * Panneau d'interaction communautaire :
 * - Contrôle segmenté iOS en verre avec role="tablist" et aria-selected
 * - Onglets : Commentaires (avec compteur), Réactions (emojis), Q & R (organisateur)
 * - Champs de saisie ergonomiques avec boutons d'envoi 44px
 * - État invité lisible et aéré
 */

const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🎉', '😮', '🎵'];

type Tab = 'comments' | 'reactions' | 'qa';

interface EventInteractionPanelProps {
  event: Event;
  isOrganizer: boolean;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export function EventInteractionPanel({ event, isOrganizer, onToast }: EventInteractionPanelProps) {
  const { user, language, t } = useApp();
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
      onToast({ message: t('events', 'detail.interaction.commentError'), type: 'error' });
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
      onToast({ message: t('events', 'detail.interaction.deleteError'), type: 'error' });
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) {
      onToast({ message: t('events', 'detail.interaction.loginToReact'), type: 'info' });
      return;
    }
    try {
      await toggleEventReaction(event.id, user.id, emoji);
      loadReactions();
    } catch (err) {
      console.error('toggleEventReaction error:', err);
      onToast({ message: t('events', 'detail.interaction.reactionError'), type: 'error' });
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
      onToast({ message: t('events', 'detail.interaction.questionSent'), type: 'success' });
    } catch (err) {
      console.error('addEventQuestion error:', err);
      setQuestions((prev) => prev.filter((q) => q.id !== optimistic.id));
      setQuestionText(text);
      onToast({ message: t('events', 'detail.interaction.questionError'), type: 'error' });
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
      onToast({ message: t('events', 'detail.interaction.answerSent'), type: 'success' });
    } catch (err) {
      console.error('answerEventQuestion error:', err);
      onToast({ message: t('events', 'detail.interaction.answerError'), type: 'error' });
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
    <div className="pt-2 space-y-4">
      {/* Contrôle segmenté en verre iOS */}
      <div
        role="tablist"
        aria-label={t('events', 'detail.interaction.commentsArea')}
        className="grid grid-cols-3 p-1.5 rounded-2xl glass-ios shadow-xs gap-1"
      >
        {[
          { id: 'comments' as Tab, label: t('events', 'detail.interaction.tabComments'), icon: MessageCircle, count: comments.length },
          { id: 'reactions' as Tab, label: t('events', 'detail.interaction.tabReactions'), icon: Flame, count: totalReactions },
          { id: 'qa' as Tab, label: t('events', 'detail.interaction.tabQuestions'), icon: HelpCircle, count: questions.length },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
                isActive
                  ? 'bg-[#6600FF] text-white shadow-sm shadow-[#6600FF]/30'
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#1A1A2E] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.count > 0 && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Onglet 1 : Commentaires & Discussions */}
      {tab === 'comments' && (
        <div id="panel-comments" role="tabpanel" className="space-y-3.5">
          {comments.length === 0 ? (
            <div className="text-center py-7 px-4 rounded-[22px] glass-ios space-y-1.5">
              <MessageCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">
                {t('events', 'detail.interaction.firstComment')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('events', 'detail.interaction.commentPrompt')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 sm:p-4 rounded-[22px] border transition-all ${
                    c.is_organizer_reply
                      ? 'bg-[#6600FF]/[0.08] dark:bg-[#6600FF]/20 border-[#6600FF]/30'
                      : 'glass-ios'
                  } ${c.id.startsWith('temp-') ? 'opacity-60' : 'opacity-100'}`}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      id={c.user_id}
                      src={c.profile?.avatar_url}
                      name={c.profile?.name || t('events', 'detail.interaction.member')}
                      role={c.is_organizer_reply ? 'organizer' : (c.profile?.role || 'participant')}
                      size="sm"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-[#1A1A2E] dark:text-white">
                          {c.profile?.name || t('events', 'detail.interaction.anonymous')}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          · {new Date(c.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                        </span>
                        {c.is_organizer_reply && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#6600FF] dark:text-purple-300 bg-[#6600FF]/15 px-2 py-0.5 rounded-full">
                            <BadgeCheck className="w-3 h-3" /> {t('events', 'detail.interaction.organizer')}
                          </span>
                        )}
                        {!c.id.startsWith('temp-') && (c.user_id === user?.id || isOrganizer) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            aria-label={t('events', 'detail.interaction.deleteComment')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 mt-1 leading-relaxed break-words">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire d'ajout de commentaire ou message invité */}
          {user ? (
            <div className="p-2.5 rounded-[22px] glass-ios flex items-end gap-2 shadow-xs">
              <UserAvatar
                id={user.id}
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
                placeholder={t('events', 'detail.interaction.commentPlaceholder')}
                className="flex-1 px-3.5 py-2.5 bg-white/70 dark:bg-white/[0.08] rounded-xl text-xs sm:text-sm text-[#1A1A2E] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]/40 resize-none min-h-[44px] max-h-24 border border-black/5 dark:border-white/10"
                rows={1}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
                className="w-11 h-11 rounded-full bg-[#6600FF] hover:bg-[#5200cc] flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-transform shrink-0 cursor-pointer shadow-sm shadow-[#6600FF]/30"
                aria-label={t('events', 'detail.interaction.sendComment')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-[22px] glass-ios text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                {t('events', 'detail.interaction.loginToDiscuss')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Onglet 2 : Réactions Emoji */}
      {tab === 'reactions' && (
        <div id="panel-reactions" role="tabpanel" className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {reactionCounts.map(({ emoji, count, mine }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReaction(emoji)}
                className={`flex flex-col items-center justify-center gap-1 p-3.5 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                  mine
                    ? 'border-[#6600FF] bg-[#6600FF]/15 dark:bg-[#6600FF]/25 shadow-xs'
                    : 'glass-ios hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <span className={`text-2xl transition-transform ${mine ? 'scale-115' : ''}`}>
                  {emoji}
                </span>
                <span className="text-xs font-black text-[#1A1A2E] dark:text-white tabular-nums">
                  {count}
                </span>
              </button>
            ))}
          </div>

          {!user && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1 font-medium">
              {t('events', 'detail.interaction.loginToReactPrompt')}
            </p>
          )}
        </div>
      )}

      {/* Onglet 3 : Questions & Réponses (Q & R) */}
      {tab === 'qa' && (
        <div id="panel-qa" role="tabpanel" className="space-y-3.5">
          {questions.length === 0 ? (
            <div className="text-center py-7 px-4 rounded-[22px] glass-ios space-y-1.5">
              <HelpCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">
                {t('events', 'detail.interaction.noQuestions')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('events', 'detail.interaction.firstQuestion')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-[22px] border transition-all ${
                    q.answer ? 'glass-ios' : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      src={q.profile?.avatar_url}
                      name={q.profile?.name || t('events', 'detail.interaction.anonymous')}
                      role="attendee"
                      size="xs"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-[#1A1A2E] dark:text-white">
                          {q.profile?.name || t('events', 'detail.interaction.anonymous')}
                        </span>
                        {q.answer ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> {t('events', 'detail.interaction.answered')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                            {t('events', 'detail.interaction.pendingAnswer')}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {new Date(q.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 mt-1 font-medium leading-relaxed">
                        {q.question}
                      </p>
                    </div>
                  </div>

                  {/* Réponse officielle */}
                  {q.answer && (
                    <div className="mt-3 pl-3.5 border-l-2 border-[#6600FF] bg-[#6600FF]/5 dark:bg-[#6600FF]/15 rounded-r-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Reply className="w-3.5 h-3.5 text-[#6600FF] dark:text-purple-300" />
                        <span className="text-xs font-bold text-[#6600FF] dark:text-purple-300">
                          {q.answerer?.name || t('events', 'detail.interaction.organizer')}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {q.answer}
                      </p>
                    </div>
                  )}

                  {/* Possibilité pour l'organisateur de répondre */}
                  {isOrganizer && !q.answer && !q.id.startsWith('temp-') && (
                    <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                      {answeringId === q.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            autoFocus
                            placeholder={t('events', 'detail.interaction.answerPlaceholder')}
                            value={answerDraft}
                            onChange={(e) => setAnswerDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAnswer(q.id);
                              if (e.key === 'Escape') {
                                setAnsweringId(null);
                                setAnswerDraft('');
                              }
                            }}
                            className="flex-1 min-h-[40px] px-3.5 py-1.5 bg-white dark:bg-white/[0.08] text-[#1A1A2E] dark:text-white rounded-xl text-xs border border-[#6600FF]/40 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]/50"
                          />
                          <button
                            type="button"
                            onClick={() => handleAnswer(q.id)}
                            disabled={submittingAnswer || !answerDraft.trim()}
                            className="min-h-[40px] px-3.5 py-1.5 bg-[#6600FF] hover:bg-[#5200cc] text-white text-xs font-bold rounded-xl disabled:opacity-40 transition-transform active:scale-95 shrink-0 cursor-pointer"
                          >
                            {t('events', 'detail.interaction.publish')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnsweringId(null);
                              setAnswerDraft('');
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAnsweringId(q.id);
                            setAnswerDraft('');
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#6600FF] dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          <Reply className="w-3.5 h-3.5" /> {t('events', 'detail.interaction.reply')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulaire de question */}
          {user ? (
            <div className="p-2.5 rounded-[22px] glass-ios flex items-center gap-2 shadow-xs">
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
                placeholder={t('events', 'detail.interaction.askPlaceholder')}
                className="flex-1 min-h-[44px] px-3.5 py-2 bg-white/70 dark:bg-white/[0.08] rounded-xl text-xs sm:text-sm text-[#1A1A2E] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]/40 border border-black/5 dark:border-white/10"
              />
              <button
                type="button"
                onClick={handleAskQuestion}
                disabled={!questionText.trim() || submittingQuestion}
                className="w-11 h-11 rounded-full bg-[#6600FF] hover:bg-[#5200cc] flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-transform shrink-0 cursor-pointer shadow-sm shadow-[#6600FF]/30"
                aria-label={t('events', 'detail.interaction.sendQuestion')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-[22px] glass-ios text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                {t('events', 'detail.interaction.loginToAsk')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
