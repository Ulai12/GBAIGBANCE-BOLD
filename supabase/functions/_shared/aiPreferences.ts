export type AIAnswerStyle = 'concise' | 'balanced' | 'detailed';

export interface AIAssistantPreferences {
  answerStyle: AIAnswerStyle;
  temperature: number;
  maxOutputTokens: number;
}

export const DEFAULT_AI_ASSISTANT_PREFERENCES: AIAssistantPreferences = {
  answerStyle: 'balanced',
  temperature: 0.7,
  maxOutputTokens: 2048,
};

export function normalizeAIAssistantPreferences(value: unknown): AIAssistantPreferences {
  const candidate = value && typeof value === 'object' ? value as Partial<AIAssistantPreferences> : {};
  const answerStyle: AIAnswerStyle =
    candidate.answerStyle === 'concise' || candidate.answerStyle === 'detailed'
      ? candidate.answerStyle
      : 'balanced';
  const temperature = candidate.temperature;
  const maxOutputTokens = candidate.maxOutputTokens;

  return {
    answerStyle,
    temperature: typeof temperature === 'number' && Number.isFinite(temperature)
      ? Math.min(1.5, Math.max(0, temperature))
      : DEFAULT_AI_ASSISTANT_PREFERENCES.temperature,
    maxOutputTokens: typeof maxOutputTokens === 'number' && Number.isFinite(maxOutputTokens)
      ? Math.round(Math.min(4096, Math.max(256, maxOutputTokens)))
      : DEFAULT_AI_ASSISTANT_PREFERENCES.maxOutputTokens,
  };
}

export function getAIAnswerStyleInstruction(style: AIAnswerStyle): string {
  switch (style) {
    case 'concise':
      return 'Préférence de forme : réponds de façon concise et directe, sans répétition.';
    case 'detailed':
      return 'Préférence de forme : donne les explications utiles et le contexte pertinent, sans spéculer ni répéter.';
    default:
      return 'Préférence de forme : donne une réponse équilibrée, claire et utile.';
  }
}
