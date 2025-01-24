import React, { useState } from 'react';
import { Bet, PlayerProp, PAYOUT_TABLE } from '../types';
import { X, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

interface BetSlipProps {
  bets: Bet[];
  props: PlayerProp[];
  onRemoveBet: (propId: string) => void;
  onTogglePosition: (bet: Bet) => void;
  onPlaceBet: (stake: number, playType: 'power' | 'flex') => void;
  balance: number;
  isLoggedIn: boolean;
  onLoginClick: () => void;
}

export function BetSlip({ 
  bets, 
  props, 
  onRemoveBet, 
  onTogglePosition,
  onPlaceBet, 
  balance, 
  isLoggedIn, 
  onLoginClick 
}: BetSlipProps) {
  const [stake, setStake] = useState<string>('10');
  const [isExpanded, setIsExpanded] = useState(false);
  const [playType, setPlayType] = useState<'power' | 'flex'>('power');

  const getAvailablePlayTypes = (numPicks: number) => {
    const types: ('power' | 'flex')[] = [];
    if (PAYOUT_TABLE.power[numPicks]) types.push('power');
    if (PAYOUT_TABLE.flex[numPicks]) types.push('flex');
    return types;
  };

  const calculatePayout = () => {
    const numPicks = bets.length;
    const payoutStructure = PAYOUT_TABLE[playType][numPicks];
    if (!payoutStructure) return 0;
    return parseFloat(stake) * payoutStructure.allCorrect;
  };

  const validateBets = () => {
    const selectedProps = bets.map(bet => props.find(p => p.id === bet.propId)!);
    
    const teams = new Set(selectedProps.map(prop => prop.team));
    if (teams.size < 2) {
      return "Must include picks from at least 2 different teams";
    }

    const players = selectedProps.map(prop => prop.player);
    const uniquePlayers = new Set(players);
    if (uniquePlayers.size !== players.length) {
      return "Cannot select the same player multiple times";
    }

    return null;
  };

  const handleQuickStake = (amount: number) => {
    setStake(amount.toString());
  };

  const availablePlayTypes = getAvailablePlayTypes(bets.length);
  const potentialPayout = calculatePayout();
  const validationError = validateBets();
  const isValidBet = bets.length >= 2 && availablePlayTypes.length > 0 && !validationError;
  const currentMultiplier = playType === 'power' 
    ? PAYOUT_TABLE.power[bets.length]?.allCorrect 
    : PAYOUT_TABLE.flex[bets.length]?.allCorrect;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-gray-800 rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] overflow-hidden border border-gray-700">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">Bet Slip</span>
              <span className="text-md text-blue-200">({bets.length} picks)</span>
              {bets.length > 0 && isValidBet && (
                <>
                  <span className="text-md font-bold text-white">
                    • {playType === 'power' ? 'Power Play' : 'Flex Play'}
                  </span>
                  {currentMultiplier && (
                    <span className="text-lg font-bold text-white">
                      • {currentMultiplier}x
                    </span>
                  )}
                </>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-white" />
            ) : (
              <ChevronUp className="h-5 w-5 text-white" />
            )}
          </button>

          {isExpanded && (
            <div className="border-t border-gray-700">
              {bets.length === 0 ? (
                <p className="text-gray-400 p-4 text-center">Select 2 or more picks to create a parlay</p>
              ) : !isValidBet ? (
                <div className="p-4">
                  <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 mb-4 flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">
                      {validationError || 
                        (bets.length === 1 ? 
                          "Add one more pick to create a Power Play" :
                          "This number of picks isn't available for either play type")}
                    </p>
                  </div>
                  <div className="space-y-1.5 mb-4 max-h-[45vh] overflow-y-auto">
                    {bets.map((bet) => {
                      const prop = props.find((p) => p.id === bet.propId)!;
                      const isLive = new Date(prop.gameTime) <= new Date() && !prop.gameComplete;
                      
                      return (
                        <div key={bet.propId} className="flex items-center justify-between bg-gray-700/50 px-3 py-2 rounded text-xs border border-gray-600">
                          <div className="flex-1 grid grid-cols-[2fr,1fr,1fr,auto,auto,auto] items-center gap-4">
                            <div className="font-medium text-gray-100 flex items-center space-x-2">
                              <span>{prop.player}</span>
                              {isLive && (
                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <span className="text-gray-300">{prop.line}</span>
                            <span className="text-gray-300">{prop.stat}</span>
                            <button
                              onClick={() => onTogglePosition(bet)}
                              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                                bet.position === 'over' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                              }`}
                            >
                              <ChevronUp className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => onTogglePosition(bet)}
                              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                                bet.position === 'under' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                              }`}
                            >
                              <ChevronDown className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => onRemoveBet(bet.propId)}
                              className="ml-2 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="space-y-1.5 mb-3 max-h-[45vh] overflow-y-auto">
                    {bets.map((bet) => {
                      const prop = props.find((p) => p.id === bet.propId)!;
                      const isLive = new Date(prop.gameTime) <= new Date() && !prop.gameComplete;
                      
                      return (
                        <div key={bet.propId} className="flex items-center justify-between bg-gray-700/50 px-3 py-2 rounded text-xs border border-gray-600">
                          <div className="flex-1 grid grid-cols-[2fr,1fr,1fr,auto,auto,auto] items-center gap-4">
                            <div className="font-medium text-gray-100 flex items-center space-x-2">
                              <span>{prop.player}</span>
                              {isLive && (
                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold animate-pulse">
                                  LIVE
                                </span>
                              )}
                            </div>
                            <span className="text-gray-300">{prop.line}</span>
                            <span className="text-gray-300">{prop.stat}</span>
                            <button
                              onClick={() => onTogglePosition(bet)}
                              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                                bet.position === 'over' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                              }`}
                            >
                              <ChevronUp className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => onTogglePosition(bet)}
                              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                                bet.position === 'under' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                              }`}
                            >
                              <ChevronDown className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => onRemoveBet(bet.propId)}
                              className="ml-2 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <label className="text-sm text-gray-400 w-24">Play Type</label>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {availablePlayTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => setPlayType(type)}
                            className={`py-2 px-4 rounded text-sm font-medium transition-colors ${
                              playType === type
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {type === 'power' ? 'Power Play' : 'Flex Play'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="text-sm text-gray-400 w-24">Stake ($)</label>
                      <div className="flex-1 flex space-x-2">
                        <div className="w-24">
                          <input
                            type="number"
                            value={stake}
                            onChange={(e) => setStake(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                            max={isLoggedIn ? balance : undefined}
                          />
                        </div>
                        <div className="flex space-x-1">
                          {[1, 5, 10, 20].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => handleQuickStake(amount)}
                              className={`w-12 py-2 text-xs font-medium rounded transition-colors ${
                                parseFloat(stake) === amount
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              ${amount}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-1">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {playType === 'power' 
                            ? PAYOUT_TABLE.power[bets.length]?.allCorrect
                            : PAYOUT_TABLE.flex[bets.length]?.allCorrect}x
                        </div>
                        <div className="text-sm text-gray-400">Win Multiplier</div>
                        {playType === 'flex' && (
                          <div className="mt-1 space-y-0.5">
                            {PAYOUT_TABLE.flex[bets.length]?.oneMiss && (
                              <div className="text-xs text-gray-500">1 miss: {PAYOUT_TABLE.flex[bets.length]?.oneMiss}x</div>
                            )}
                            {PAYOUT_TABLE.flex[bets.length]?.twoMiss && (
                              <div className="text-xs text-gray-500">2 misses: {PAYOUT_TABLE.flex[bets.length]?.twoMiss}x</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-400">
                          ${potentialPayout.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">Max Payout</div>
                      </div>
                    </div>

                    <button
                      onClick={() => isLoggedIn ? onPlaceBet(parseFloat(stake), playType) : onLoginClick()}
                      disabled={!isValidBet || (isLoggedIn && parseFloat(stake) > balance)}
                      className="w-full bg-emerald-600 text-white py-2 rounded font-medium hover:bg-emerald-700 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      {isLoggedIn ? 'Place Bet' : 'Log In to Place Bet'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}