import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { PlayerProp } from '../types';
import { teamLogos } from '../lib/teamLogos';

interface PropTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: Record<string, number>;
  props: PlayerProp[];
  selectedGame: string;
  onGameChange: (game: string) => void;
}

export function PropTabs({ activeTab, onTabChange, props, selectedGame, onGameChange }: PropTabsProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const games = useMemo(() => {
    const uniqueGames = new Map();
    const now = new Date();

    props.forEach(prop => {
      const gameTime = new Date(prop.gameTime);
      if (gameTime < now) return;

      // Create a unique key that's consistent regardless of team order
      const teams = [prop.team, prop.opponent].sort();
      const gameKey = `${teams.join('-')}-${prop.gameTime}`;

      if (!uniqueGames.has(gameKey)) {
        const formattedTime = gameTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        uniqueGames.set(gameKey, {
          key: gameKey,
          teams,
          time: formattedTime,
          gameTime: prop.gameTime
        });
      }
    });

    return Array.from(uniqueGames.values()).sort((a, b) => {
      return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime();
    });
  }, [props]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onTabChange(query ? `search:${query}` : 'all');
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setSearchQuery('');
    onTabChange('all');
    onGameChange('');
  };

  if (isSearchOpen) {
    return (
      <div className="bg-gray-900 mb-4 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gray-800 rounded-lg">
            <div className="flex items-center p-4 space-x-4">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search players..."
                className="bg-transparent text-gray-100 flex-1 focus:outline-none text-lg"
                autoFocus
              />
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  onTabChange('all');
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {searchQuery && (
              <div className="px-4 pb-4 text-sm text-gray-400">
                Showing results for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 mb-4">
      {/* Game Filter */}
      <div className="overflow-x-auto scrollbar-hide max-w-7xl mx-auto px-4">
        <div className="flex space-x-2 whitespace-nowrap py-2">
          <div className={`flex flex-col items-center rounded-lg transition-colors ${
            !selectedGame
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}>
            <button
              onClick={() => onGameChange('')}
              className="px-4 py-2 text-sm font-medium w-full text-center h-full"
            >
              <div>All</div>
              <div>Games</div>
            </button>
          </div>
          {games.map(({ key, teams, time }) => (
            <div
              key={key}
              className={`flex flex-col rounded-lg transition-colors min-w-[120px] ${
                selectedGame === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
            >
              <button
                onClick={() => onGameChange(key)}
                className="p-1 text-sm font-medium w-full"
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center space-x-2">
                    <img 
                      src={teamLogos[teams[0]]} 
                      alt={teams[0]} 
                      className="w-10 h-10"
                    />
                    <span className="font-bold text-xs">vs</span>
                    <img 
                      src={teamLogos[teams[1]]} 
                      alt={teams[1]} 
                      className="w-10 h-10"
                    />
                  </div>
                  <div className="text-xs opacity-75 mt-1">{time}</div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Prop Type Filters */}
      <div className="overflow-x-auto scrollbar-hide max-w-7xl mx-auto px-4">
        <div className="flex space-x-2 whitespace-nowrap py-2">
          <button
            onClick={handleOpenSearch}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-800 text-gray-200 hover:bg-gray-700"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => onTabChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onTabChange('points')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'points'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            Points
          </button>
          <button
            onClick={() => onTabChange('rebounds')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'rebounds'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            Rebounds
          </button>
          <button
            onClick={() => onTabChange('assists')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'assists'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            Assists
          </button>
          <button
            onClick={() => onTabChange('3PM')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === '3PM'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            3PM
          </button>
          <button
            onClick={() => onTabChange('blocks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'blocks'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            Blocks
          </button>
          <button
            onClick={() => onTabChange('steals')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'steals'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            Steals
          </button>
        </div>
      </div>
    </div>
  );
}