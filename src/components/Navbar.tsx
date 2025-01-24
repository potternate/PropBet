import React from 'react';
import { 
  Dices, // For props - represents betting/games
  FileText, // For lineups - represents past/active bets
  Trophy, // Keep trophy for leaderboard
  User, // For profile - better representation of user profile
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  balance: number;
  isLoggedIn: boolean;
}

export function Navbar({ activeTab, onTabChange, balance, isLoggedIn }: NavbarProps) {
  return (
    <>
      {/* Top Balance Display */}
      <div className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-blue-400">PropBet</span>
          </div>
          <button
            onClick={() => onTabChange('profile')}
            className="flex items-center space-x-2 text-gray-300 hover:text-gray-100"
          >
            {isLoggedIn ? (
              <>
                <span className="font-bold text-emerald-400">${balance.toFixed(2)}</span>
              </>
            ) : (
              <span className="font-bold text-emerald-400">Log In</span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg z-50">
        <div className="max-w-7xl mx-auto grid grid-cols-4">
          <button
            onClick={() => onTabChange('props')}
            className={`flex flex-col items-center py-3 ${
              activeTab === 'props' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Dices className="h-6 w-6" />
            <span className="text-xs mt-1">Props</span>
          </button>
          <button
            onClick={() => onTabChange('lineups')}
            className={`flex flex-col items-center py-3 ${
              activeTab === 'lineups' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs mt-1">Entries</span>
          </button>
          <button
            onClick={() => onTabChange('leaderboard')}
            className={`flex flex-col items-center py-3 ${
              activeTab === 'leaderboard' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Trophy className="h-6 w-6" />
            <span className="text-xs mt-1">Leaderboard</span>
          </button>
          <button
            onClick={() => onTabChange('profile')}
            className={`flex flex-col items-center py-3 ${
              activeTab === 'profile' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>
    </>
  );
}