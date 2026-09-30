import React from 'react';

/**
 * GBAIGBANCE — Rendu Markdown Sécurisé & Élégant (Apple iOS Design)
 * 
 * Analyse et formate le texte généré par l'IA :
 * - Gras (**texte** ou __texte__)
 * - Italique (*texte* ou _texte_)
 * - Gras + Italique (***texte***)
 * - Code en ligne (`code`)
 * - Citations / Notes (> texte)
 * - Titres de sections (### ou ## ou #)
 * - Listes à puces (- item, * item, • item)
 * - Listes numérotées (1. item)
 * - Lignes de séparation (---)
 * - Paragraphes avec interligne fluide
 * 
 * 100% sécurisé (aucun dangerouslySetInnerHTML, aucun risque XSS).
 */

interface AIMarkdownRendererProps {
  content: string;
  className?: string;
}

export const AIMarkdownRenderer: React.FC<AIMarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: { type: 'bullet' | 'number'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const isBullet = currentList.type === 'bullet';
    elements.push(
      <ul
        key={`list-${elements.length}`}
        className="my-2.5 space-y-1.5 pl-1 text-xs sm:text-sm text-gray-700 dark:text-gray-200"
      >
        {currentList.items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <span
              className={`shrink-0 mt-1.5 rounded-full ${
                isBullet
                  ? 'w-1.5 h-1.5 bg-[#6600FF] dark:bg-[#A78BFA]'
                  : 'text-[11px] font-black text-[#6600FF] dark:text-[#A78BFA]'
              }`}
            >
              {!isBullet && `${idx + 1}.`}
            </span>
            <span className="flex-1 leading-relaxed">{renderInlineFormatting(item)}</span>
          </li>
        ))}
      </ul>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Séparateur horizontal (---)
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(
        <hr key={`hr-${i}`} className="my-3 border-black/[0.06] dark:border-white/[0.08]" />
      );
      continue;
    }

    // Titres de section Markdown (### ou ## ou #)
    if (trimmed.startsWith('#')) {
      const headerMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headerMatch) {
        flushList();
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        elements.push(
          <div
            key={`header-${i}`}
            className={`font-black tracking-tight text-[#17131D] dark:text-white ${
              level <= 2 ? 'text-sm sm:text-base mt-4 mb-2' : 'text-xs sm:text-sm mt-3 mb-1.5'
            } text-[#6600FF] dark:text-[#A78BFA] flex items-center gap-1.5`}
          >
            <span>{renderInlineFormatting(headerText)}</span>
          </div>
        );
        continue;
      }
    }

    // Citations / Notes (> texte)
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteText = trimmed.replace(/^>\s*/, '');
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2.5 pl-3 py-2 border-l-3 border-[#6600FF] dark:border-[#A78BFA] bg-[#6600FF]/5 dark:bg-[#6600FF]/15 rounded-r-2xl text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic"
        >
          {renderInlineFormatting(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Puces (-, *, •)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bullet') {
        flushList();
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numéros (1., 2.)
    const numberMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== 'number') {
        flushList();
        currentList = { type: 'number', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }

    // Ligne de texte normal
    flushList();
    elements.push(
      <p
        key={`p-${i}`}
        className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed my-1.5 break-words"
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

/**
 * Analyse le formatage inline : ***gras+italique***, **gras**, *italique*, `code`, etc.
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return '';

  const parts: React.ReactNode[] = [];
  // Regex capturant les segments spéciaux
  const regex = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|_([^_]+)_|`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('***') && fullMatch.endsWith('***')) {
      // Gras + Italique
      parts.push(
        <strong key={`bi-${match.index}`} className="font-black italic text-[#17131D] dark:text-white">
          {match[2]}
        </strong>
      );
    } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      // Gras
      parts.push(
        <strong key={`b-${match.index}`} className="font-extrabold text-[#17131D] dark:text-white">
          {match[3]}
        </strong>
      );
    } else if (fullMatch.startsWith('__') && fullMatch.endsWith('__')) {
      // Gras souligné
      parts.push(
        <strong key={`bu-${match.index}`} className="font-extrabold text-[#17131D] dark:text-white">
          {match[5]}
        </strong>
      );
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      // Italique
      parts.push(
        <em key={`i-${match.index}`} className="italic text-gray-600 dark:text-gray-300">
          {match[4]}
        </em>
      );
    } else if (fullMatch.startsWith('_') && fullMatch.endsWith('_')) {
      // Italique
      parts.push(
        <em key={`iu-${match.index}`} className="italic text-gray-600 dark:text-gray-300">
          {match[6]}
        </em>
      );
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      // Code en ligne
      parts.push(
        <code
          key={`c-${match.index}`}
          className="px-1.5 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.1] font-mono text-[11px] text-[#6600FF] dark:text-[#A78BFA] font-bold"
        >
          {match[7]}
        </code>
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
