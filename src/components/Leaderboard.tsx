import React, { useState, useEffect } from 'react';
import { Trophy, Calendar } from 'lucide-react';
import { User, ParlayBet } from '../types';
import { subscribeToAllBets } from '../lib/database';

interface LeaderboardProps {
  users: User[];
}

interface UserProfit {
  userId: string;
  username: string;
  profit: number;
}

export function Leaderboard({ users }: LeaderboardProps) {
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'all'>('all');
  const [bets, setBets] = useState<ParlayBet[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfit[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToAllBets((allBets) => {
      setBets(allBets);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filteredBets = bets.filter(bet => {
      const betDate = new Date(bet.timestamp);
      if (timePeriod === 'week') return betDate >= weekAgo;
      if (timePeriod === 'month') return betDate >= monthAgo;
      return true;
    });

    const userProfits = users.map(user => {
      const userBets = filteredBets.filter(bet => bet.userId === user.id);
      const profit = userBets.reduce((total, bet) => {
        if (bet.status === 'won') return total + (bet.potentialPayout - bet.stake);
        if (bet.status === 'lost') return total - bet.stake;
        if (bet.status === 'refund') return total;
        return total;
      }, 0);

      return {
        userId: user.id,
        username: user.username,
        profit
      };
    });

    setLeaderboard(userProfits.sort((a, b) => b.profit - a.profit));
  }, [users, bets, timePeriod]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-center space-x-3 mb-8">
        <Trophy className="h-8 w-8 text-yellow-400" />
        <h2 className="text-2xl font-bold text-gray-100">Profit Leaderboard</h2>
      </div>

      <div className="flex justify-center mb-6 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setTimePeriod('week')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            timePeriod === 'week'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setTimePeriod('month')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            timePeriod === 'month'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setTimePeriod('all')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            timePeriod === 'all'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          All Time
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
        {leaderboard.map((user, index) => (
          <div
            key={user.userId}
            className="flex items-center justify-between p-4 border-b border-gray-700 last:border-b-0"
          >
            <div className="flex items-center space-x-4">
              <span
                className={`w-10 text-right text-lg font-bold ${
                  index === 0
                    ? 'text-yellow-400'
                    : index === 1
                    ? 'text-gray-400'
                    : index === 2
                    ? 'text-amber-600'
                    : 'text-gray-500'
                }`}
              >
                #{index + 1}
              </span>
              <span className="font-medium text-gray-200">{user.username}</span>
            </div>
            <span className={`font-bold ${user.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {user.profit >= 0 ? '+' : ''}{user.profit.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}