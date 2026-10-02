import type { Href } from 'expo-router';

export interface GameModule {
  key: string;
  title: string;
  description: string;
  href: Href;
}

export const gameModules: Record<string, GameModule[]> = {
  'the-gang-2024': [
    {
      key: 'the-gang-missions',
      title: 'Rút nhiệm vụ',
      description: 'Thử thách, Chuyên gia và thẻ Homebrew theo từng chế độ chơi.',
      href: '/games/the-gang-2024/missions',
    },
  ],
};
