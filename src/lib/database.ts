import { ref, set, get, update, push, onValue, query, orderByChild, remove } from 'firebase/database';
import { db } from './firebase';
import { User, ParlayBet, PlayerProp } from '../types';
import { nbaPlayerData } from './playerData';

export async function createUser(userId: string, username: string): Promise<void> {
  await set(ref(db, `users/${userId}`), {
    username,
    balance: 100, // Starting balance
    createdAt: new Date().toISOString()
  });
}

export async function getUser(userId: string): Promise<User | null> {
  const snapshot = await get(ref(db, `users/${userId}`));
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      id: userId,
      username: data.username,
      balance: data.balance
    };
  }
  return null;
}

export async function updateUserData(userId: string, data: Partial<User>): Promise<void> {
  await update(ref(db, `users/${userId}`), data);
}

export async function deleteUser(userId: string): Promise<void> {
  await remove(ref(db, `users/${userId}`));
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  await update(ref(db, `users/${userId}`), {
    balance: newBalance
  });
}

export async function placeParlayBet(userId: string, bet: Omit<ParlayBet, 'id'>): Promise<string> {
  const betRef = push(ref(db, 'bets'));
  const betId = betRef.key!;
  
  await set(betRef, {
    ...bet,
    userId,
    timestamp: new Date().toISOString()
  });
  
  return betId;
}

export async function updateBetStatus(betId: string, status: 'pending' | 'won' | 'lost' | 'refund'): Promise<void> {
  await update(ref(db, `bets/${betId}`), { status });
}

export async function deleteBet(betId: string): Promise<void> {
  await remove(ref(db, `bets/${betId}`));
}

export async function updatePropScore(
  propId: string, 
  actualScore: number | null,
  refundStatus: boolean,
  gameComplete: boolean
): Promise<void> {
  const updates: Partial<PlayerProp> = {
    actualScore: actualScore === null ? null : actualScore,
    refundStatus,
    gameComplete,
    updatedAt: new Date().toISOString()
  };
  
  await update(ref(db, `props/${propId}`), updates);
  
  // Get all pending bets that include this prop
  const betsSnapshot = await get(ref(db, 'bets'));
  const bets: ParlayBet[] = [];
  betsSnapshot.forEach((childSnapshot) => {
    const bet = childSnapshot.val();
    if (bet.status === 'pending' && bet.bets.some(b => b.propId === propId)) {
      bets.push({
        ...bet,
        id: childSnapshot.key!
      });
    }
  });

  // Get all props for processing
  const propsSnapshot = await get(ref(db, 'props'));
  const props: PlayerProp[] = [];
  propsSnapshot.forEach((childSnapshot) => {
    props.push({
      ...childSnapshot.val(),
      id: childSnapshot.key!
    });
  });

  // Process each bet
  for (const bet of bets) {
    await processBetOutcome(bet, props);
  }
}

async function processBetOutcome(bet: ParlayBet, props: PlayerProp[]): Promise<void> {
  // Check if all games are complete
  const allGamesComplete = bet.bets.every(leg => {
    const prop = props.find(p => p.id === leg.propId);
    return prop?.gameComplete;
  });

  if (!allGamesComplete) return;

  // Process each leg
  let effectiveLegs = bet.bets.length;
  const results = bet.bets.map(leg => {
    const prop = props.find(p => p.id === leg.propId)!;
    
    if (prop.refundStatus) {
      effectiveLegs--;
      return 'refund';
    }

    if (prop.actualScore === undefined) return null;

    const result = leg.position === 'over' ?
      (prop.actualScore > leg.line ? 'hit' : 'miss') :
      (prop.actualScore < leg.line ? 'hit' : 'miss');

    // Update the leg result
    leg.result = result;
    return result;
  });

  // If any leg is null (no actual score), return
  if (results.includes(null)) return;

  const hits = results.filter(r => r === 'hit').length;
  const misses = results.filter(r => r === 'miss').length;
  const refunds = results.filter(r => r === 'refund').length;

  // Update effective legs count
  bet.effectiveLegs = effectiveLegs;

  // If all legs are refunded, refund the bet
  if (refunds === bet.bets.length) {
    await updateBetStatus(bet.id, 'refund');
    const user = await getUser(bet.userId);
    if (user) {
      await updateUserBalance(bet.userId, user.balance + bet.stake);
    }
    return;
  }

  // Calculate payout based on play type and results
  let payout = 0;
  if (bet.playType === 'power') {
    if (hits === effectiveLegs) {
      payout = bet.potentialPayout;
    }
  } else { // Flex play
    const flexPayouts = {
      3: { 3: 2.25, 2: 1.25 },
      4: { 4: 5, 3: 1.5 },
      5: { 5: 10, 4: 2, 3: 0.4 },
      6: { 6: 25, 5: 2, 4: 0.4 }
    };

    const payoutTable = flexPayouts[effectiveLegs as keyof typeof flexPayouts];
    if (payoutTable) {
      payout = bet.stake * (payoutTable[hits as keyof typeof payoutTable] || 0);
    }
  }

  // Update bet status and user balance
  const status = payout > 0 ? 'won' : 'lost';
  
  // Update the bet with results and new status
  await update(ref(db, `bets/${bet.id}`), {
    status,
    bets: bet.bets,
    effectiveLegs
  });

  if (payout > 0) {
    const user = await getUser(bet.userId);
    if (user) {
      await updateUserBalance(bet.userId, user.balance + payout);
    }
  }
}

export function subscribeToProps(callback: (props: PlayerProp[]) => void): () => void {
  const propsRef = ref(db, 'props');
  const propsQuery = query(propsRef, orderByChild('createdAt'));
  
  const unsubscribe = onValue(propsQuery, (snapshot) => {
    const props: PlayerProp[] = [];
    snapshot.forEach((childSnapshot) => {
      const prop = childSnapshot.val();
      if (!prop.hidden) {
        props.push({
          id: childSnapshot.key!,
          ...prop
        });
      }
    });
    callback(props);
  });
  
  return unsubscribe;
}

export function subscribeToUserBets(userId: string, callback: (bets: ParlayBet[]) => void): () => void {
  const betsRef = ref(db, 'bets');
  
  const unsubscribe = onValue(betsRef, (snapshot) => {
    const bets: ParlayBet[] = [];
    snapshot.forEach((childSnapshot) => {
      const bet = childSnapshot.val();
      if (bet.userId === userId) {
        bets.push({
          ...bet,
          id: childSnapshot.key!
        });
      }
    });
    callback(bets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  });
  
  return unsubscribe;
}

export function subscribeToAllBets(callback: (bets: ParlayBet[]) => void): () => void {
  const betsRef = ref(db, 'bets');
  
  const unsubscribe = onValue(betsRef, (snapshot) => {
    const bets: ParlayBet[] = [];
    snapshot.forEach((childSnapshot) => {
      bets.push({
        ...childSnapshot.val(),
        id: childSnapshot.key!
      });
    });
    callback(bets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  });
  
  return unsubscribe;
}

export function subscribeToUser(userId: string, callback: (user: User) => void): () => void {
  const userRef = ref(db, `users/${userId}`);
  
  const unsubscribe = onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback({
        id: userId,
        username: data.username,
        balance: data.balance
      });
    }
  });
  
  return unsubscribe;
}

export function subscribeToAllUsers(callback: (users: User[]) => void): () => void {
  const usersRef = ref(db, 'users');
  
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      users.push({
        id: childSnapshot.key!,
        username: data.username,
        balance: data.balance
      });
    });
    callback(users);
  });
  
  return unsubscribe;
}

export async function updateProp(propId: string, prop: PlayerProp): Promise<void> {
  await set(ref(db, `props/${propId}`), {
    ...prop,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteProp(propId: string): Promise<void> {
  await remove(ref(db, `props/${propId}`));
}

export async function createProp(prop: Omit<PlayerProp, 'id'>): Promise<string> {
  const propRef = push(ref(db, 'props'));
  await set(propRef, {
    ...prop,
    createdAt: new Date().toISOString()
  });
  return propRef.key!;
}

function getTeamAbbreviation(teamName: string): string {
  const abbreviations: Record<string, string> = {
    'Atlanta Hawks': 'ATL',
    'Boston Celtics': 'BOS',
    'Brooklyn Nets': 'BKN',
    'Charlotte Hornets': 'CHA',
    'Chicago Bulls': 'CHI',
    'Cleveland Cavaliers': 'CLE',
    'Dallas Mavericks': 'DAL',
    'Denver Nuggets': 'DEN',
    'Detroit Pistons': 'DET',
    'Golden State Warriors': 'GSW',
    'Houston Rockets': 'HOU',
    'Indiana Pacers': 'IND',
    'Los Angeles Clippers': 'LAC',
    'Los Angeles Lakers': 'LAL',
    'Memphis Grizzlies': 'MEM',
    'Miami Heat': 'MIA',
    'Milwaukee Bucks': 'MIL',
    'Minnesota Timberwolves': 'MIN',
    'New Orleans Pelicans': 'NOP',
    'New York Knicks': 'NYK',
    'Oklahoma City Thunder': 'OKC',
    'Orlando Magic': 'ORL',
    'Philadelphia 76ers': 'PHI',
    'Phoenix Suns': 'PHX',
    'Portland Trail Blazers': 'POR',
    'Sacramento Kings': 'SAC',
    'San Antonio Spurs': 'SAS',
    'Toronto Raptors': 'TOR',
    'Utah Jazz': 'UTA',
    'Washington Wizards': 'WAS'
  };

  return abbreviations[teamName] || teamName;
}

export async function refreshProps(): Promise<{ success: boolean; message: string }> {
  try {
    const API_KEY = import.meta.env.VITE_ODDS_API_KEY;
    if (!API_KEY) {
      throw new Error('API key not found');
    }

    const SPORT = "basketball_nba";
    const BASE_URL = "https://api.the-odds-api.com/v4/sports";

    // Fetch today's events
    const eventsResponse = await fetch(
      `${BASE_URL}/${SPORT}/events?apiKey=${API_KEY}&regions=us&markets=h2h&dateFormat=iso&oddsFormat=decimal`
    );
    
    if (!eventsResponse.ok) {
      throw new Error(`Events API Error: ${eventsResponse.status}`);
    }

    const events = await eventsResponse.json();
    const eventIds = events.map((event: any) => event.id);

    // Get existing props
    const propsSnapshot = await get(ref(db, 'props'));
    const existingProps: Record<string, PlayerProp> = propsSnapshot.val() || {};

    // Track statistics
    let skippedPlayers = 0;
    let skippedDuplicates = 0;
    let updatedProps = 0;
    let newProps = 0;
    const propsToUpdate: Record<string, PlayerProp> = { ...existingProps };
    
    for (const eventId of eventIds) {
      const propsResponse = await fetch(
        `${BASE_URL}/${SPORT}/events/${eventId}/odds?apiKey=${API_KEY}&regions=us&markets=player_points,player_rebounds,player_assists,player_blocks,player_steals,player_threes&oddsFormat=decimal`
      );

      if (!propsResponse.ok) {
        console.error(`Error fetching props for event ${eventId}:`, propsResponse.status);
        continue;
      }

      const eventData = await propsResponse.json();
      
      if (!eventData.bookmakers?.[0]?.markets) continue;

      const bookmaker = eventData.bookmakers[0];
      const homeTeam = getTeamAbbreviation(eventData.home_team);
      const awayTeam = getTeamAbbreviation(eventData.away_team);

      bookmaker.markets.forEach((market: any) => {
        if (!market.outcomes) return;

        const statType = 
          market.key === 'player_points' ? 'Points' :
          market.key === 'player_rebounds' ? 'Rebounds' :
          market.key === 'player_blocks' ? 'Blocks' :
          market.key === 'player_steals' ? 'Steals' :
          market.key === 'player_threes' ? '3PM' :
          market.key === 'player_assists' ? 'Assists' : null;

        if (!statType) return;

        // Group outcomes by player
        const playerOutcomes = new Map<string, any[]>();
        market.outcomes.forEach((outcome: any) => {
          const playerName = outcome.description;
          if (!playerOutcomes.has(playerName)) {
            playerOutcomes.set(playerName, []);
          }
          playerOutcomes.get(playerName)!.push(outcome);
        });

        // Process each player's over/under pair
        playerOutcomes.forEach((outcomes, playerName) => {
          if (outcomes.length !== 2) return;

          // Check if we can find the player in our mappings
          const playerData = nbaPlayerData[playerName];

          if (!playerData) {
            skippedPlayers++;
            return;
          }

          const [over, under] = outcomes[0].name.includes('Over') ? 
            [outcomes[0], outcomes[1]] : 
            [outcomes[1], outcomes[0]];

          const team = playerData.team;
          const opponent = team === homeTeam ? awayTeam : homeTeam;

          // Find any existing prop for this player/stat/game
          const existingProp = Object.entries(propsToUpdate).find(([_, prop]) => 
            prop.player === playerName && 
            prop.stat === statType && 
            prop.gameTime === eventData.commence_time &&
            !prop.hidden
          )?.[1];

          // If exact same prop exists (including line value), skip it
          if (existingProp && existingProp.line === over.point) {
            skippedDuplicates++;
            return;
          }

          // If prop exists but line value changed, hide the old one
          if (existingProp) {
            const existingPropId = Object.entries(propsToUpdate).find(([_, prop]) => prop === existingProp)?.[0];
            if (existingPropId) {
              propsToUpdate[existingPropId] = {
                ...existingProp,
                hidden: true,
                updatedAt: new Date().toISOString()
              };
              updatedProps++;
            }
          }

          // Add the new prop
          const newPropRef = push(ref(db, 'props'));
          const propId = newPropRef.key!;
          
          propsToUpdate[propId] = {
            id: propId,
            player: playerName,
            playerId: playerData.id,
            team,
            opponent,
            gameTime: eventData.commence_time,
            stat: statType,
            line: over.point,
            odds: {
              over: over.price,
              under: under.price
            },
            hidden: false,
            gameComplete: false,
            refundStatus: false,
            createdAt: new Date().toISOString()
          };
          newProps++;
        });
      });
    }

    // Update all props at once
    await set(ref(db, 'props'), propsToUpdate);

    return { 
      success: true, 
      message: `Props refreshed: ${newProps} new, ${updatedProps} updated, ${skippedDuplicates} unchanged (${skippedPlayers} players skipped due to missing mappings)` 
    };
  } catch (error) {
    console.error('Error refreshing props:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}