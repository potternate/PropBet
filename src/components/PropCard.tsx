import React, { useState, useEffect } from 'react';
import { PlayerProp } from '../types';
import { teamLogos } from '../lib/teamLogos';
import { BarChart as ChartBar, X } from 'lucide-react';
import { subscribeToProps } from '../lib/database';

interface PropCardProps {
  prop: PlayerProp;
  onSelectBet: (propId: string, position: 'over' | 'under') => void;
  selected?: {
    propId: string;
    position: 'over' | 'under';
  };
  onFlip: (propId: string | null) => void;
  isFlipped: boolean;
}

interface PastScore {
  date: string;
  opponent: string;
  actualScore: number;
}

export function PropCard({ prop, onSelectBet, selected, onFlip, isFlipped }: PropCardProps) {
  const [pastScores, setPastScores] = useState<PastScore[]>([]);

  const playerImageUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${prop.playerId || 'fallback'}.png`;
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png';
  };
  
  const gameTime = new Date(prop.gameTime);
  const formattedTime = gameTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const isSelected = selected?.propId === prop.id;

  useEffect(() => {
    const unsubscribe = subscribeToProps((props) => {
      const pastProps = props.filter(p => 
        p.player === prop.player && 
        p.stat === prop.stat && 
        p.gameComplete &&
        p.actualScore !== undefined &&
        new Date(p.gameTime) < new Date()
      );

      const scores = pastProps.map(p => ({
        date: new Date(p.gameTime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        opponent: p.opponent,
        actualScore: p.actualScore!
      }));

      setPastScores(scores.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    });

    return () => unsubscribe();
  }, [prop.player, prop.stat]);

  const handleStatsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFlip(prop.id);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFlip(null);
  };

  return (
    <div className="relative h-full">
      <div 
        className={`w-full h-full transition-transform duration-300 transform-gpu preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div 
          className={`absolute inset-0 bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col h-full relative overflow-hidden ${
            isFlipped ? 'backface-hidden' : ''
          } ${isSelected ? 'border-2 border-emerald-600' : 'border-2 border-gray-600'}`}
        >
          {/* Team Logo Background */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `url(${teamLogos[prop.team]})`,
              backgroundSize: '200%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />

          {/* Stats button only shown on front side */}
          {!isFlipped && (
            <button
              onClick={handleStatsClick}
              className="absolute top-2 left-2 p-2 text-gray-400 hover:text-gray-200 transition-colors z-10"
            >
              <ChartBar className="h-5 w-5" />
            </button>
          )}

          <div className="p-2 flex-grow relative">
            {/* Player Image */}
            <div className="w-20 h-20 mx-auto mb-2">
              <img 
                src={playerImageUrl}
                alt={prop.player}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>

            {/* Player Name */}
            <h3 className="text-sm font-bold text-gray-100 text-center mb-1">{prop.player}</h3>

            {/* Teams and Game Time */}
            <div className="text-xs font-medium text-gray-400 text-center mb-1">
              {prop.team} vs {prop.opponent} • {formattedTime}
            </div>

            {/* Prop Value and Type */}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg font-bold text-gray-100">{prop.line}</span>
              <span className="text-sm font-medium text-gray-400 py-0.5 rounded">
                {prop.stat}
              </span>
            </div>
          </div>

          {/* Over/Under Buttons */}
          <div className="grid grid-cols-2 border-t border-gray-600 relative">
            <button
              onClick={() => onSelectBet(prop.id, 'over')}
              className={`py-2 text-sm font-bold transition-colors rounded-bl-lg ${
                isSelected && selected?.position === 'over'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'hover:bg-gray-700 text-gray-200'
              }`}
            >
              Over
            </button>
            <button
              onClick={() => onSelectBet(prop.id, 'under')}
              className={`py-2 text-sm font-bold transition-colors rounded-br-lg border-l border-gray-600 ${
                isSelected && selected?.position === 'under'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'hover:bg-gray-700 text-gray-200'
              }`}
            >
              Under
            </button>
          </div>
        </div>

        {/* Back of card */}
        <div 
          className={`absolute inset-0 bg-gray-800 rounded-lg shadow-md border-2 border-gray-600 transform rotate-y-180 backface-hidden overflow-hidden ${
            isFlipped ? '' : 'pointer-events-none'
          }`}
        >
          <div className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-100">Past {prop.stat}</h3>
              <button
                onClick={handleCloseClick}
                className="text-gray-400 hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {pastScores.length === 0 ? (
                <p className="text-gray-400 text-sm text-center">No past games found</p>
              ) : (
                <div className="space-y-2">
                  {pastScores.map((score, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center text-sm py-2 border-b border-gray-700 last:border-b-0"
                    >
                      <span className="text-gray-300">
                        {score.date} vs {score.opponent}
                      </span>
                      <span className={`font-bold ${
                        score.actualScore > prop.line ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {score.actualScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}