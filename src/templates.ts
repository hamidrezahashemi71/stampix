export interface Template {
  key: string;
  name: string;
  checkpoints: string[];
  hint: string;
}

/** Ready-made categories. Each stamp marks *reaching* a checkpoint:
 *  the first one is the start moment, the last one ends the session. */
export const TEMPLATES: Template[] = [
  {
    key: 'commute',
    name: 'commute',
    checkpoints: ['leave home', 'station', 'board', 'get off', 'arrive work'],
    hint: 'home → work',
  },
  {
    key: 'return',
    name: 'return',
    checkpoints: ['leave work', 'station', 'board', 'get off', 'arrive home'],
    hint: 'work → home',
  },
  {
    key: 'cooking',
    name: 'cooking',
    checkpoints: ['start prep', 'start cooking', 'served'],
    hint: 'prep · cook · serve',
  },
  { key: 'study', name: 'study', checkpoints: ['start', 'end'], hint: 'one focused block' },
  {
    key: 'workout',
    name: 'workout',
    checkpoints: ['start', 'warm-up done', 'main done', 'cool-down done'],
    hint: 'warm-up · main · cool-down',
  },
  { key: 'errand', name: 'errand', checkpoints: [], hint: 'free stamps, end manually' },
];

export const SEED_TEMPLATE_KEYS = ['commute', 'cooking', 'study'];

export const DEFAULT_QUICK_TAGS = ['traffic', 'delay', 'rain', 'tired', 'focused', 'interrupted'];
