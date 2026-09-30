import React from 'react';

/**
 * GBAIGBANCE — Rendu Markdown Sécurisé & Élégant (Apple iOS Design)
 * 
 * Analyse et formate le texte généré par l'IA :
 * - Gras (**texte** ou __texte__)
 * - Italique (*texte* ou _texte_)
 * - Titres de sections (### ou ##)
 * - Listes à puces (- item, * item, • item)
 * - Listes numérotées (1. item)
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

  // Découpage en blocs (titres, puces, paragraphes)
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: { type: 'bullet' | 'number'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const isBullet = currentList.type === 'bullet';
    elements.push(
      <ul
        key={`list-${elements.length}`}
        className="my-2.5 space-y-1.5 pl-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200"
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

    // Titres de section Markdown (### ou ##)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      const headerText = trimmed.replace(/^#{1,4}\s+/, '');
      elements.push(
        <h4
          key={`header-${i}`}
          className="text-xs sm:text-sm font-black text-[#17131D] dark:text-white uppercase tracking-wider mt-3.5 mb-1.5 flex items-center gap-1.5 text-[#6600FF] dark:text-[#A78BFA]"
        >
          <span>{renderInlineFormatting(headerText)}</span>
        </h4>
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
 * Analyse le formatage inline : **gras**, *italique*, etc.
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Regex pour détecter **gras** et *italique*
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|___([^_]+)___)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      // Gras
      parts.push(
        <strong key={`b-${match.index}`} className="font-extrabold text-[#17131D] dark:text-white">
          {match[2]}
        </strong>
      );
    } else if (fullMatch.startsWith('__') && fullMatch.endsWith('__')) {
      // Gras souligné
      parts.push(
        <strong key={`bu-${match.index}`} className="font-extrabold text-[#17131D] dark:text-white">
          {match[4]}
        </strong>
      );
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      // Italique
      parts.push(
        <em key={`i-${match.index}`} className="italic text-gray-600 dark:text-gray-300">
          {match[3]}
        </em>
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
