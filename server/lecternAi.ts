import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface StrategizeRequest {
  wizardName: string;
  raceName: string;
  elementName: string;
  level: number;
  rank: number;
  activeCreatureName: string;
  goal: string;
}

export async function generateArchivistAdvice(req: StrategizeRequest): Promise<{ advice: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      advice:
        `Archivist Lyra's Desk Note (Offline Preview): As a Rank ${req.rank} ${req.raceName} attuned to ${req.elementName}, pair an opposing Prism with a +35% Blade before spending 4+ School Pips, and keep your ${req.activeCreatureName} on Branch B support skills during Rare Trials.`,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = [
    'You are Archivist Lyra at the Aldervale Academy Lectern for the game "Aldervale: Pact of Ten".',
    'Give concise, practical 3-bullet deckbuilding, School Pip / Archmastery, or hybrid creature breeding advice.',
    'Do not invent pay-to-win mechanics; everything in Aldervale is earned through gameplay.',
    `Wizard: ${req.wizardName} (${req.raceName}, ${req.elementName} Affinity, Level ${req.level}, Rank ${req.rank}).`,
    `Active Creature: ${req.activeCreatureName}.`,
    `Question / Goal: ${req.goal}`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      // Custom User-Agent header per guidelines when invoking server-side Gemini API
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    },
  });

  return {
    advice: response.text ?? 'Check your Blade-to-Prism balance and keep your Sideboard stocked with Keen Ink Enchants.',
  };
}
