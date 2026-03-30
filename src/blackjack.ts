export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export type Card = {
  id: string;
  rank: Rank;
  suit: Suit;
};

export type RoundResult = 'win' | 'lose' | 'push' | 'blackjack';

export type Hand = {
  id: string;
  cards: Card[];
  bet: number;
  stood: boolean;
  busted: boolean;
  doubled: boolean;
  blackjack: boolean;
  isSplitAces?: boolean;
  result?: RoundResult;
};

export type SessionStats = {
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
};

export type HandSummary = {
  total: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
};

export type AnalysisSnapshot = {
  bustProbability: number;
  safeProbability: number;
  improvementProbability: number;
  topDraws: Array<{label: string; chance: number}>;
  remainingCards: number;
  highCardRatio: number;
  lowCardRatio: number;
  aceRatio: number;
  runningCount: number;
  trueCount: number;
};

export type Recommendation = {
  action: 'Hit' | 'Stand' | 'Double' | 'Split';
  reason: string;
};

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const TEN_VALUE_RANKS: Rank[] = ['10', 'J', 'Q', 'K'];

let idCounter = 0;

export function createShuffledDeck(deckCount = 1): Card[] {
  const deck: Card[] = [];

  for (let deckIndex = 0; deckIndex < deckCount; deckIndex += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `${deckIndex}-${suit}-${rank}-${idCounter++}`,
          rank,
          suit,
        });
      }
    }
  }

  const shuffled = [...deck];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function rankValue(rank: Rank): number {
  if (rank === 'A') {
    return 11;
  }

  if (TEN_VALUE_RANKS.includes(rank)) {
    return 10;
  }

  return Number(rank);
}

export function summarizeHand(cards: Card[]): HandSummary {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    total += rankValue(card.rank);
    if (card.rank === 'A') {
      aces += 1;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return {
    total,
    isSoft: cards.some((card) => card.rank === 'A') && total <= 21 && aces > 0,
    isBlackjack: cards.length === 2 && total === 21,
    isBust: total > 21,
  };
}

export function createHand(cards: Card[], bet = 1): Hand {
  const summary = summarizeHand(cards);

  return {
    id: `hand-${idCounter++}`,
    cards,
    bet,
    stood: summary.isBlackjack,
    busted: summary.isBust,
    doubled: false,
    blackjack: summary.isBlackjack,
  };
}

export function drawCard(shoe: Card[]): {card: Card; shoe: Card[]} {
  const [card, ...rest] = shoe;

  if (!card) {
    throw new Error('The shoe is empty.');
  }

  return {card, shoe: rest};
}

export function shouldDealerHit(cards: Card[]): boolean {
  const summary = summarizeHand(cards);
  return summary.total < 17;
}

export function dealerShouldReveal(dealerCards: Card[], phase: 'player' | 'dealer' | 'round-over') {
  return phase !== 'player' || summarizeHand(dealerCards).isBlackjack;
}

export function compareHands(player: HandSummary, dealer: HandSummary): RoundResult {
  if (player.isBust) return 'lose';
  if (dealer.isBust) return player.isBlackjack ? 'blackjack' : 'win';
  if (player.isBlackjack && !dealer.isBlackjack) return 'blackjack';
  if (!player.isBlackjack && dealer.isBlackjack) return 'lose';
  if (player.total > dealer.total) return 'win';
  if (player.total < dealer.total) return 'lose';
  return 'push';
}

export function canDouble(hand: Hand, phase: 'player' | 'dealer' | 'round-over'): boolean {
  return phase === 'player' && hand.cards.length === 2 && !hand.stood && !hand.busted && !hand.isSplitAces;
}

export function canSplit(hand: Hand, phase: 'player' | 'dealer' | 'round-over', handCount: number): boolean {
  if (phase !== 'player' || hand.cards.length !== 2 || handCount >= 2) {
    return false;
  }

  return hand.cards[0].rank === hand.cards[1].rank;
}

export function getRecommendation(hand: Hand, dealerUpCard: Card): Recommendation {
  const summary = summarizeHand(hand.cards);
  const dealerValue = dealerUpCard.rank === 'A' ? 11 : rankValue(dealerUpCard.rank);

  if (canRecommendSplit(hand)) {
    const splitAdvice = getPairRecommendation(hand.cards[0].rank, dealerValue);
    if (splitAdvice) {
      return splitAdvice;
    }
  }

  if (summary.isSoft && hand.cards.length === 2) {
    return getSoftRecommendation(summary.total, dealerValue);
  }

  return getHardRecommendation(summary.total, dealerValue);
}

function canRecommendSplit(hand: Hand): boolean {
  return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
}

function getPairRecommendation(rank: Rank, dealerValue: number): Recommendation | null {
  if (rank === 'A' || rank === '8') {
    return {
      action: 'Split',
      reason: 'A-A와 8-8은 가장 대표적인 분할 상황입니다.',
    };
  }

  if (rank === '10') {
    return {
      action: 'Stand',
      reason: '10-10은 이미 강한 20이므로 분할보다 스탠드가 일반적입니다.',
    };
  }

  if (rank === '9') {
    return dealerValue === 7 || dealerValue === 10 || dealerValue === 11
      ? {action: 'Stand', reason: '9-9는 7, 10, A 상대로는 스탠드가 일반적입니다.'}
      : {action: 'Split', reason: '9-9는 중간 이하 딜러 업카드 상대로 분할이 유리합니다.'};
  }

  if (rank === '7') {
    return dealerValue <= 7
      ? {action: 'Split', reason: '7-7은 2-7 상대로 분할이 일반적입니다.'}
      : {action: 'Hit', reason: '강한 딜러 업카드 상대로는 분할보다 히트가 보편적입니다.'};
  }

  if (rank === '6') {
    return dealerValue <= 6
      ? {action: 'Split', reason: '6-6은 2-6 상대로 분할이 일반적입니다.'}
      : {action: 'Hit', reason: '7 이상 상대로는 히트가 더 무난합니다.'};
  }

  if (rank === '5') {
    return dealerValue <= 9
      ? {action: 'Double', reason: '5-5는 보통 분할하지 않고 10으로 보고 더블다운을 노립니다.'}
      : {action: 'Hit', reason: '딜러 10 또는 A 상대로는 히트가 더 일반적입니다.'};
  }

  if (rank === '4') {
    return {action: 'Hit', reason: '4-4는 이 테이블 규칙에서는 분할보다 히트가 무난합니다.'};
  }

  if (rank === '3' || rank === '2') {
    return dealerValue <= 7
      ? {action: 'Split', reason: `${rank}-${rank}는 2-7 상대로 분할이 일반적입니다.`}
      : {action: 'Hit', reason: `${rank}-${rank}는 강한 업카드 상대로 히트가 더 일반적입니다.`};
  }

  return null;
}

function getSoftRecommendation(total: number, dealerValue: number): Recommendation {
  if (total <= 17) {
    if (total === 17 && dealerValue >= 3 && dealerValue <= 6) {
      return {action: 'Double', reason: '소프트 17은 3-6 상대로 더블다운이 일반적입니다.'};
    }

    return {action: 'Hit', reason: '소프트 13-17은 버스트 위험이 낮아 히트가 일반적입니다.'};
  }

  if (total === 18) {
    if (dealerValue >= 3 && dealerValue <= 6) {
      return {action: 'Double', reason: '소프트 18은 3-6 상대로 더블다운이 자주 권장됩니다.'};
    }

    return dealerValue >= 9 || dealerValue === 11
      ? {action: 'Hit', reason: '소프트 18은 9, 10, A 상대로 히트가 일반적입니다.'}
      : {action: 'Stand', reason: '소프트 18은 중간 이하 업카드 상대로 스탠드가 무난합니다.'};
  }

  return {action: 'Stand', reason: '소프트 19 이상은 스탠드가 일반적입니다.'};
}

function getHardRecommendation(total: number, dealerValue: number): Recommendation {
  if (total <= 8) {
    return {action: 'Hit', reason: '하드 8 이하는 히트가 기본입니다.'};
  }

  if (total === 9) {
    return dealerValue >= 3 && dealerValue <= 6
      ? {action: 'Double', reason: '하드 9는 3-6 상대로 더블다운이 일반적입니다.'}
      : {action: 'Hit', reason: '하드 9는 강한 업카드 상대로 히트가 무난합니다.'};
  }

  if (total === 10) {
    return dealerValue <= 9
      ? {action: 'Double', reason: '하드 10은 2-9 상대로 더블다운이 일반적입니다.'}
      : {action: 'Hit', reason: '딜러 10 또는 A 상대로는 히트가 더 일반적입니다.'};
  }

  if (total === 11) {
    return {action: 'Double', reason: '하드 11은 가장 대표적인 더블다운 구간입니다.'};
  }

  if (total === 12) {
    return dealerValue >= 4 && dealerValue <= 6
      ? {action: 'Stand', reason: '하드 12는 4-6 상대로 스탠드가 일반적입니다.'}
      : {action: 'Hit', reason: '하드 12는 2-3, 7-A 상대로 히트가 일반적입니다.'};
  }

  if (total >= 13 && total <= 16) {
    return dealerValue <= 6
      ? {action: 'Stand', reason: '하드 13-16은 약한 딜러 상대로 스탠드가 일반적입니다.'}
      : {action: 'Hit', reason: '하드 13-16은 강한 딜러 상대로 히트가 일반적입니다.'};
  }

  return {action: 'Stand', reason: '하드 17 이상은 스탠드가 기본입니다.'};
}

export function analyzeHand(hand: Hand, shoe: Card[], exposedCards: Card[]): AnalysisSnapshot {
  if (shoe.length === 0) {
    return {
      bustProbability: 0,
      safeProbability: 0,
      improvementProbability: 0,
      topDraws: [],
      remainingCards: 0,
      highCardRatio: 0,
      lowCardRatio: 0,
      aceRatio: 0,
      runningCount: 0,
      trueCount: 0,
    };
  }

  const current = summarizeHand(hand.cards);
  let busts = 0;
  let safe = 0;
  let improvement = 0;
  const drawMap = new Map<string, number>();
  const highCards = shoe.filter((card) => rankValue(card.rank) === 10).length;
  const lowCards = shoe.filter((card) => ['2', '3', '4', '5', '6'].includes(card.rank)).length;
  const aces = shoe.filter((card) => card.rank === 'A').length;

  for (const card of shoe) {
    const nextSummary = summarizeHand([...hand.cards, card]);
    if (nextSummary.isBust) {
      busts += 1;
    } else {
      safe += 1;
      if (nextSummary.total > current.total || (nextSummary.total === 21 && current.total !== 21)) {
        improvement += 1;
      }
    }

    const label = formatRankLabel(card.rank);
    drawMap.set(label, (drawMap.get(label) ?? 0) + 1);
  }

  const runningCount = getRunningCount(exposedCards);
  const decksRemaining = Math.max(shoe.length / 52, 0.25);
  const topDraws = [...drawMap.entries()]
    .map(([label, count]) => ({label, chance: count / shoe.length}))
    .sort((left, right) => right.chance - left.chance)
    .slice(0, 4);

  return {
    bustProbability: busts / shoe.length,
    safeProbability: safe / shoe.length,
    improvementProbability: improvement / shoe.length,
    topDraws,
    remainingCards: shoe.length,
    highCardRatio: highCards / shoe.length,
    lowCardRatio: lowCards / shoe.length,
    aceRatio: aces / shoe.length,
    runningCount,
    trueCount: runningCount / decksRemaining,
  };
}

export function getExposedCards(playerHands: Hand[], dealerCards: Card[], dealerRevealed: boolean): Card[] {
  const playerCards = playerHands.flatMap((hand) => hand.cards);
  const visibleDealerCards = dealerRevealed ? dealerCards : dealerCards.slice(0, 1);
  return [...playerCards, ...visibleDealerCards];
}

function getRunningCount(cards: Card[]): number {
  let count = 0;

  for (const card of cards) {
    if (['2', '3', '4', '5', '6'].includes(card.rank)) {
      count += 1;
    } else if (card.rank === 'A' || TEN_VALUE_RANKS.includes(card.rank)) {
      count -= 1;
    }
  }

  return count;
}

function formatRankLabel(rank: Rank): string {
  if (rank === 'A') return 'A';
  if (TEN_VALUE_RANKS.includes(rank)) return '10/J/Q/K';
  return rank;
}

export function formatResult(result?: RoundResult): string {
  if (result === 'blackjack') return '블랙잭';
  if (result === 'win') return '승리';
  if (result === 'lose') return '패배';
  if (result === 'push') return '무승부';
  return '진행 중';
}
