import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PropCard } from './components/PropCard';
import { PropTabs } from './components/PropTabs';
import { BetSlip } from './components/BetSlip';
import { Leaderboard } from './components/Leaderboard';
import { Profile } from './components/Profile';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { PlayerProp, Bet, User, ParlayBet, PAYOUT_TABLE } from './types';
import { subscribeToUser, placeParlayBet, updateUserBalance, subscribeToUserBets, subscribeToAllUsers, subscribeToProps } from './lib/database';

function ScoreMeter({ prop, bet }: { prop: PlayerProp; bet: Bet }) {
  const max = Math.ceil(prop.line * 1.2); // 20% above the line value
  const linePosition = (prop.line / max) * 100;
  const scorePosition = prop.actualScore !== undefined ? (prop.actualScore / max) * 100 : 0;

  const isWinning = prop.actualScore !== undefined ? (
    bet.position === 'over' ? 
      prop.actualScore > prop.line : 
      prop.actualScore < prop.line
  ) : false;

  return (
    <div className="mt-2 flex items-center justify-between">
      <div className="relative h-2 bg-gray-600 rounded-full overflow-hidden flex-1">
        {/* Line marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10" // Ensure it stays above the progress fill
          style={{ left: `${linePosition}%` }}
        />
        
        {/* Score progress */}
        {prop.actualScore !== undefined && (
          <div 
            className={`absolute top-0 bottom-0 transition-all duration-500 ${
              prop.refundStatus ? 'bg-gray-200' :
              isWinning ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            style={{ 
              left: '0%',
              width: `${scorePosition}%`
            }}
          />
        )}
      </div>
      
      {/* Actual Score */}
      {prop.actualScore !== undefined && (
        <div className={`text-sm ml-2 ${prop.refundStatus ? 'text-gray-200' :
            isWinning ? 'text-emerald-400' : 'text-red-400'}`}>
          {prop.actualScore}
        </div>
      )}
    </div>
  );
}

function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('props');
  const [propFilter, setPropFilter] = useState('all');
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedBets, setSelectedBets] = useState<Bet[]>([]);
  const [balance, setBalance] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [userBets, setUserBets] = useState<ParlayBet[]>([]);
  const [lineupsTab, setLineupsTab] = useState<'pending' | 'past'>('pending');
  const [props, setProps] = useState<PlayerProp[]>([]);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const unsubscribeUser = subscribeToUser(user.uid, (userData) => {
        setBalance(userData.balance);
      });

      const unsubscribeUserBets = subscribeToUserBets(user.uid, (bets) => {
        setUserBets(bets);
      });

      const unsubscribeAllUsers = subscribeToAllUsers((allUsers) => {
        setUsers(allUsers);
      });

      const unsubscribeProps = subscribeToProps((props) => {
        setProps(props);
      });

      return () => {
        unsubscribeUser();
        unsubscribeUserBets();
        unsubscribeAllUsers();
        unsubscribeProps();
      };
    } else {
      const unsubscribeProps = subscribeToProps((props) => {
        setProps(props);
      });

      const unsubscribeAllUsers = subscribeToAllUsers((allUsers) => {
        setUsers(allUsers);
      });

      return () => {
        unsubscribeProps();
        unsubscribeAllUsers();
      };
    }
  }, [user]);

  const handleSelectBet = (propId: string, position: 'over' | 'under') => {
    const prop = props.find(p => p.id === propId)!;
    const existingBetIndex = selectedBets.findIndex(b => b.propId === propId);

    if (existingBetIndex !== -1) {
      const updatedBets = [...selectedBets];
      updatedBets.splice(existingBetIndex, 1);
      setSelectedBets(updatedBets);
    } else {
      const newBet: Bet = {
        propId,
        position,
        line: prop.line,
        odds: position === 'over' ? prop.odds.over : prop.odds.under
      };
      setSelectedBets([...selectedBets, newBet]);
    }
  };

  const handleTogglePosition = (bet: Bet) => {
    const prop = props.find(p => p.id === bet.propId)!;
    const newPosition = bet.position === 'over' ? 'under' : 'over';
    const updatedBets = selectedBets.map(b => {
      if (b.propId === bet.propId) {
        return {
          ...b,
          position: newPosition,
          odds: newPosition === 'over' ? prop.odds.over : prop.odds.under
        };
      }
      return b;
    });
    setSelectedBets(updatedBets);
  };

  const handleRemoveBet = (propId: string) => {
    setSelectedBets(selectedBets.filter(bet => bet.propId !== propId));
  };

  const handlePlaceBet = async (stake: number, playType: 'power' | 'flex') => {
    if (!user || stake > balance) return;

    const payoutStructure = PAYOUT_TABLE[playType][selectedBets.length];
    if (!payoutStructure) return;

    const potentialPayout = stake * payoutStructure.allCorrect;

    await placeParlayBet(user.uid, {
      userId: user.uid,
      bets: selectedBets,
      stake,
      potentialPayout,
      status: 'pending',
      timestamp: new Date().toISOString(),
      playType
    });

    const newBalance = balance - stake;
    await updateUserBalance(user.uid, newBalance);
    
    setSelectedBets([]);
  };

  const sortedAndFilteredProps = props
    .filter(prop => {
      const gameTime = new Date(prop.gameTime);
      const now = new Date();
      if (gameTime < now) {
        return false;
      }

      // Filter by selected game
      if (selectedGame) {
        const gameKey = `${prop.team}-${prop.opponent}-${prop.gameTime}`;
        const reverseGameKey = `${prop.opponent}-${prop.team}-${prop.gameTime}`;
        if (gameKey !== selectedGame && reverseGameKey !== selectedGame) {
          return false;
        }
      }

      if (propFilter.startsWith('search:')) {
        const query = propFilter.replace('search:', '').toLowerCase();
        return prop.player.toLowerCase().includes(query);
      }
      
      if (propFilter === 'all') return true;
      if (propFilter === 'points') return prop.stat === 'Points';
      if (propFilter === 'rebounds') return prop.stat === 'Rebounds';
      if (propFilter === 'assists') return prop.stat === 'Assists';
      if (propFilter === '3PM') return prop.stat === '3PM';
      if (propFilter === 'blocks') return prop.stat === 'Blocks';
      if (propFilter === 'steals') return prop.stat === 'Steals';
      return false;
    })
    .sort((a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime());

  const activeProps = props.filter(prop => new Date(prop.gameTime) > new Date());
  const propCounts = {
    all: activeProps.length,
    points: activeProps.filter(prop => prop.stat === 'Points').length,
    rebounds: activeProps.filter(prop => prop.stat === 'Rebounds').length,
    assists: activeProps.filter(prop => prop.stat === 'Assists').length,
    threepm: activeProps.filter(prop => prop.stat === '3PM').length,
    blocks: activeProps.filter(prop => prop.stat === 'Blocks').length,
    steals: activeProps.filter(prop => prop.stat === 'Steals').length
  };

  const renderLoginMessage = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-gray-800 rounded-lg p-8 text-center max-w-md w-full border border-gray-700">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Log In Required</h2>
        <p className="text-gray-400 mb-6">
          Please log in to view your bet history and track your active bets.
        </p>
        <button
          onClick={() => setActiveTab('profile')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Log In
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        balance={balance}
        isLoggedIn={!!user}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8 pb-32 pt-20">
        {activeTab === 'props' ? (
          <>
            <PropTabs
              activeTab={propFilter}
              onTabChange={setPropFilter}
              counts={propCounts}
              props={props}
              selectedGame={selectedGame}
              onGameChange={setSelectedGame}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-24">
              {sortedAndFilteredProps.map(prop => (
                <PropCard
                  key={prop.id}
                  prop={prop}
                  onSelectBet={handleSelectBet}
                  selected={selectedBets.find(bet => bet.propId === prop.id)}
                  onFlip={setFlippedCardId}
                  isFlipped={flippedCardId === prop.id}
                />
              ))}
            </div>
            {selectedBets.length > 0 && (
              <BetSlip
                bets={selectedBets}
                props={props}
                onRemoveBet={handleRemoveBet}
                onTogglePosition={handleTogglePosition}
                onPlaceBet={handlePlaceBet}
                balance={balance}
                isLoggedIn={!!user}
                onLoginClick={() => setActiveTab('profile')}
              />
            )}
          </>
        ) : activeTab === 'lineups' ? (
          user ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="flex border-b border-gray-700">
                  <button
                    onClick={() => setLineupsTab('pending')}
                    className={`flex-1 px-4 py-3 text-center font-medium ${
                      lineupsTab === 'pending'
                        ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Open ({userBets.filter(bet => bet.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setLineupsTab('past')}
                    className={`flex-1 px-4 py-3 text-center font-medium ${
                      lineupsTab === 'past'
                        ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Past ({userBets.filter(bet => bet.status !== 'pending').length})
                  </button>
                </div>
                <div className="p-4">
                  {lineupsTab === 'pending' ? (
                    userBets.filter(bet => bet.status === 'pending').length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No open bets</p>
                    ) : (
                      <div className="space-y-4">
                        {userBets
                          .filter(bet => bet.status === 'pending')
                          .map((bet) => (
                            <div key={bet.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="text-sm text-gray-400">
                                    {new Date(bet.timestamp).toLocaleDateString()}
                                  </span>
                                  <div className="font-medium text-gray-100">
                                    {bet.bets.length} Pick {bet.playType === 'power' ? 'Power' : 'Flex'} Play
                                  </div>
                                </div>
                                <div className="px-2 py-1 rounded text-sm bg-blue-600 text-blue-100">
                                  Open
                                </div>
                              </div>
                              <div className="space-y-2">
                                {bet.bets.map((parlayBet, index) => {
                                  const prop = props.find(p => p.id === parlayBet.propId);
                                  return (
                                    <div key={index} className="text-sm">
                                      <span className="text-gray-300">{prop?.player}</span>
                                      <span className="text-gray-400"> • </span>
                                      <span className="text-gray-300">
                                        {parlayBet.position.toUpperCase()} {parlayBet.line} {prop?.stat}
                                      </span>
                                      {prop && <ScoreMeter prop={prop} bet={parlayBet} />}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-600 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Stake: </span>
                                  <span className="text-gray-200">${bet.stake.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">To Win: </span>
                                  <span className="text-emerald-400">${bet.potentialPayout.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )
                  ) : (
                    userBets.filter(bet => bet.status !== 'pending').length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No past bets</p>
                    ) : (
                      <div className="space-y-4">
                        {userBets
                          .filter(bet => bet.status !== 'pending')
                          .map((bet) => (
                            <div key={bet.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="text-sm text-gray-400">
                                    {new Date(bet.timestamp).toLocaleDateString()}
                                  </span>
                                  <div className="font-medium text-gray-100">
                                    {bet.bets.length} Pick {bet.playType === 'power' ? 'Power' : 'Flex'} Play
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-sm ${
                                  bet.status === 'won' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                }`}>
                                  {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                                </div>
                              </div>
                              <div className="space-y-2">
                                {bet.bets.map((parlayBet, index) => {
                                  const prop = props.find(p => p.id === parlayBet.propId);
                                  return (
                                    <div key={index} className="text-sm">
                                      <span className="text-gray-300">{prop?.player}</span>
                                      <span className="text-gray-400"> • </span>
                                      <span className="text-gray-300">
                                        {parlayBet.position.toUpperCase()} {parlayBet.line} {prop?.stat}
                                      </span>
                                      {prop && <ScoreMeter prop={prop} bet={parlayBet} />}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-600 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Stake: </span>
                                  <span className="text-gray-200">${bet.stake.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">To Win: </span>
                                  <span className="text-emerald-400">${bet.potentialPayout.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : renderLoginMessage()
        ) : activeTab === 'leaderboard' ? (
          <Leaderboard users={users} />
        ) : (
          user ? <Profile /> : <LoginPage />
        )}
      </main>
    </div>
  );
}

export default App;