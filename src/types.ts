export interface PlayerProp {
  id: string;
  player: string;
  team: string;
  opponent: string;
  gameTime: string;
  stat: string;
  line: number;
  odds: {
    over: number;
    under: number;
  };
  playerId?: string;
  hidden?: boolean;
  actualScore?: number;
  refundStatus: boolean;
  gameComplete: boolean;
  createdAt: string;
}

export interface Bet {
  propId: string;
  position: 'over' | 'under';
  line: number;
  odds: number;
  result?: 'hit' | 'miss' | 'refund';
}

export interface ParlayBet {
  id: string;
  userId: string;
  bets: Bet[];
  stake: number;
  potentialPayout: number;
  status: 'pending' | 'won' | 'lost' | 'refund';
  timestamp: string;
  playType: 'power' | 'flex';
  effectiveLegs?: number;
}

export interface User {
  id: string;
  username: string;
  balance: number;
}

export const PAYOUT_TABLE = {
  power: {
    2: { allCorrect: 3 },
    3: { allCorrect: 5 },
    4: { allCorrect: 10 },
    5: { allCorrect: 20 },
    6: { allCorrect: 37.5 }
  },
  flex: {
    3: { allCorrect: 2.25, oneMiss: 1.25 },
    4: { allCorrect: 5, oneMiss: 1.5 },
    5: { allCorrect: 10, oneMiss: 2, twoMiss: 0.4 },
    6: { allCorrect: 25, oneMiss: 2, twoMiss: 0.4 }
  }
} as const;