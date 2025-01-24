import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, DollarSign, Trophy, LogOut, Plus, Trash2, Save, X, Edit2, Users, RefreshCw, Search } from 'lucide-react';
import { subscribeToUser, subscribeToUserBets, subscribeToProps, updateProp, deleteProp, createProp, subscribeToAllUsers, updateUserData, updateBetStatus, deleteUser, subscribeToAllBets, refreshProps, updatePropScore, deleteBet } from '../lib/database';
import type { ParlayBet, PlayerProp, User as UserType } from '../types';

export function Profile() {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState(0);
  const [bets, setBets] = useState<ParlayBet[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'props' | 'bets'>('profile');
  const [props, setProps] = useState<PlayerProp[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [allBets, setAllBets] = useState<ParlayBet[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState('');
  const [editingBalance, setEditingBalance] = useState('');
  const [newProp, setNewProp] = useState<Partial<PlayerProp>>({
    player: '',
    playerId: '',
    team: '',
    opponent: '',
    gameTime: new Date().toISOString().slice(0, 16),
    stat: 'Points',
    line: 0,
    odds: { over: 1.91, under: 1.91 }
  });
  const [username, setUsername] = useState<string>('');
  const [propSearchQuery, setPropSearchQuery] = useState('');
  
  useEffect(() => {
    if (user) {
      setIsAdmin(user.email === import.meta.env.VITE_ADMIN_EMAIL);

      const unsubscribeUser = subscribeToUser(user.uid, (userData) => {
        setBalance(userData.balance);
        setUsername(userData.username);
      });
      
      const unsubscribeUserBets = subscribeToUserBets(user.uid, (userBets) => {
        setBets(userBets);
      });

      const unsubscribeProps = subscribeToProps((props) => {
        setProps(props.sort((a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()));
      });

      const unsubscribeAllUsers = subscribeToAllUsers((users) => {
        setAllUsers(users);
      });

      const unsubscribeAllBets = subscribeToAllBets((bets) => {
        setAllBets(bets);
      });

      return () => {
        unsubscribeUser();
        unsubscribeUserBets();
        unsubscribeProps();
        unsubscribeAllUsers();
        unsubscribeAllBets();
      };
    }
  }, [user]);

  const handleAddProp = async () => {
    if (!user || !isAdmin) return;
    await createProp({
      ...newProp,
      refundStatus: false,
      gameComplete: false,
      createdAt: new Date().toISOString()
    } as Omit<PlayerProp, 'id'>);
    setNewProp({
      player: '',
      playerId: '',
      team: '',
      opponent: '',
      gameTime: new Date().toISOString().slice(0, 16),
      stat: 'Points',
      line: 0,
      odds: { over: 1.91, under: 1.91 }
    });
  };

  const handleDeleteProp = async (propId: string) => {
    if (!user || !isAdmin) return;
    await deleteProp(propId);
  };

  const handleUpdateProp = async (propId: string, updatedProp: PlayerProp) => {
    if (!user || !isAdmin) return;
    await updateProp(propId, updatedProp);
  };

  const handleUpdateUser = async (userId: string) => {
    if (!user || !isAdmin) return;
    const updates: Partial<UserType> = {};
    if (editingUsername) updates.username = editingUsername;
    if (editingBalance) updates.balance = parseFloat(editingBalance);
    await updateUserData(userId, updates);
    setEditingUser(null);
    setEditingUsername('');
    setEditingBalance('');
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user || !isAdmin) return;
    await deleteUser(userId);
  };

  const handleUpdateBetStatus = async (betId: string, status: 'pending' | 'won' | 'lost' | 'refund') => {
    if (!user || !isAdmin) return;
    await updateBetStatus(betId, status);
  };

  const handleDeleteBet = async (betId: string) => {
    if (!user || !isAdmin) return;
    if (window.confirm('Are you sure you want to delete this bet? This action cannot be undone.')) {
      await deleteBet(betId);
    }
  };

  // Calculate stats
  const betsPlaced = bets.length;
  const betsWon = bets.filter(bet => bet.status === 'won').length;
  const winRate = betsPlaced > 0 ? ((betsWon / betsPlaced) * 100).toFixed(1) : '0.0';

  const sortedProps = [...props].sort((a, b) => {
    const timeA = new Date(a.gameTime).getTime();
    const timeB = new Date(b.gameTime).getTime();
    return timeB - timeA;
  });

  const filteredProps = sortedProps.filter(prop => {
    if (!propSearchQuery) return true;
    const searchLower = propSearchQuery.toLowerCase();
    return (
      prop.player.toLowerCase().includes(searchLower) ||
      prop.team.toLowerCase().includes(searchLower) ||
      prop.opponent.toLowerCase().includes(searchLower) ||
      prop.stat.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Profile Overview */}
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="h-8 w-8 text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-100">{username || user?.displayName || 'User'}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-gray-300">Balance</span>
            </div>
            <span className="text-2xl font-bold text-emerald-400">${balance.toFixed(2)}</span>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-gray-300">Bets Placed</span>
            </div>
            <span className="text-2xl font-bold text-gray-100">{betsPlaced}</span>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-sm text-gray-300">Win Rate</span>
            </div>
            <span className="text-2xl font-bold text-gray-100">{winRate}%</span>
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`p-2 rounded-lg flex items-center justify-center space-x-2 ${
                activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab('props')}
              className={`p-2 rounded-lg flex items-center justify-center space-x-2 ${
                activeTab === 'props' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>Props</span>
            </button>
            <button
              onClick={() => setActiveTab('bets')}
              className={`p-2 rounded-lg flex items-center justify-center space-x-2 ${
                activeTab === 'bets' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>Bets</span>
            </button>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to refresh props?')) {
                  const result = await refreshProps();
                  alert(result.message);
                }
              }}
              className="p-2 rounded-lg flex items-center justify-center space-x-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <RefreshCw className="h-6 w-6" />
            </button>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 bg-red-900/50 text-red-200 py-3 rounded-lg hover:bg-red-900/70 transition-colors border border-red-800"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Admin Sections */}
      {isAdmin && activeTab === 'users' && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-100">Manage Users</h3>
            <span className="text-sm text-gray-400">
              {allUsers.length} {allUsers.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          <div className="space-y-4">
            {allUsers.map((user) => (
              <div key={user.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                {editingUser === user.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Username</label>
                      <input
                        type="text"
                        value={editingUsername}
                        onChange={(e) => setEditingUsername(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                        placeholder={user.username}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Balance</label>
                      <input
                        type="number"
                        value={editingBalance}
                        onChange={(e) => setEditingBalance(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                        placeholder={user.balance.toString()}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateUser(user.id)}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(null);
                          setEditingUsername('');
                          setEditingBalance('');
                        }}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-200">{user.username}</h4>
                      <p className="text-sm text-emerald-400">${user.balance.toFixed(2)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user.id);
                          setEditingUsername(user.username);
                          setEditingBalance(user.balance.toString());
                        }}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && activeTab === 'props' && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-gray-100 mb-4">Manage Props</h3>
          
          {/* Add New Prop Form */}
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 mb-6">
            <h4 className="text-lg font-medium text-gray-200 mb-4">Add New Prop</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Player Name</label>
                <input
                  type="text"
                  value={newProp.player}
                  onChange={(e) => setNewProp({ ...newProp, player: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Player ID</label>
                <input
                  type="text"
                  value={newProp.playerId}
                  onChange={(e) => setNewProp({ ...newProp, playerId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                  placeholder="NBA.com player ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Team</label>
                <input
                  type="text"
                  value={newProp.team}
                  onChange={(e) => setNewProp({ ...newProp, team: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                  placeholder="e.g., PHX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Opponent</label>
                <input
                  type="text"
                  value={newProp.opponent}
                  onChange={(e) => setNewProp({ ...newProp, opponent: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                  placeholder="e.g., LAL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Game Time</label>
                <input
                  type="datetime-local"
                  value={newProp.gameTime}
                  onChange={(e) => setNewProp({ ...newProp, gameTime: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Stat Type</label>
                <select
                  value={newProp.stat}
                  onChange={(e) => setNewProp({ ...newProp, stat: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                >
                  <option value="Points">Points</option>
                  <option value="Rebounds">Rebounds</option>
                  <option value="Assists">Assists</option>
                  <option value="3PM">3PM</option>
                  <option value="Blocks">Blocks</option>
                  <option value="Steals">Steals</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Line</label>
                <input
                  type="number"
                  step="0.5"
                  value={newProp.line}
                  onChange={(e) => setNewProp({ ...newProp, line: parseFloat(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                />
              </div>
            </div>
            <button
              onClick={handleAddProp}
              className="mt-4 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full"
            >
              <Plus className="h-5 w-5" />
              <span>Add Prop</span>
            </button>
          </div>

          {/* Existing Props List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-200">Current Props</h4>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="text"
                    value={propSearchQuery}
                    onChange={(e) => setPropSearchQuery(e.target.value)}
                    placeholder="Search props..."
                    className="w-64 bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-400"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <span className="text-sm text-gray-400">
                  {filteredProps.length} of {props.length} {props.length === 1 ? 'prop' : 'props'}
                </span>
              </div>
            </div>
            {filteredProps.map((prop) => (
              <div key={prop.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-medium text-gray-200">{prop.player}</h5>
                    <p className="text-sm text-gray-400">
                      {prop.team} vs {prop.opponent} • {new Date(prop.gameTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteProp(prop.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Stat: </span>
                    <span className="text-gray-200">{prop.stat}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Line: </span>
                    <span className="text-gray-200">{prop.line}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Actual: </span>
                    <input
                      type="number"
                      value={prop.actualScore === undefined ? '' : prop.actualScore}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        updatePropScore(prop.id, value, prop.refundStatus || false, prop.gameComplete || false);
                      }}
                      className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-100"
                      placeholder="Score"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label>
                      <input
                        type="checkbox"
                        checked={prop.refundStatus || false}
                        onChange={(e) => updatePropScore(
                          prop.id, 
                          prop.actualScore ?? null, 
                          e.target.checked,
                          prop.gameComplete || false
                        )}
                        className="mr-1"
                      />
                      <span className="text-sm text-gray-400">Refund</span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={prop.gameComplete || false}
                        onChange={(e) => updatePropScore(
                          prop.id, 
                          prop.actualScore ?? null, 
                          prop.refundStatus || false,
                          e.target.checked
                        )}
                        className="mr-1"
                      />
                      <span className="text-sm text-gray-400">Complete</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && activeTab === 'bets' && (
        <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-100">Manage Bets</h3>
            <span className="text-sm text-gray-400">
              {allBets.length} {allBets.length === 1 ? 'bet' : 'bets'}
            </span>
          </div>
          <div className="space-y-4">
            {allBets.map((bet) => {
              const user = allUsers.find(u => u.id === bet.userId);
              return (
                <div key={bet.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-200">{user?.username || 'Unknown User'}</h4>
                      <p className="text-sm text-gray-400">
                        {new Date(bet.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={bet.status}
                        onChange={(e) => handleUpdateBetStatus(bet.id, e.target.value as 'pending' | 'won' | 'lost' | 'refund')}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
                      >
                        <option value="pending">Pending</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="refund">Refund</option>
                      </select>
                      <button
                        onClick={() => handleDeleteBet(bet.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-gray-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                          {prop?.actualScore !== undefined && (
                            <span className={`ml-2 ${
                              parlayBet.result === 'refund' ? 'text-yellow-400' :
                              parlayBet.position === 'over' ?
                                (prop.actualScore > parlayBet.line ? 'text-emerald-400' : 'text-red-400') :
                                (prop.actualScore < parlayBet.line ? 'text-emerald-400' : 'text-red-400')
                            }`}>
                              ({prop.actualScore})
                            </span>
                          )}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}