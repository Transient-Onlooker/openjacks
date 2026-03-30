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

export type Hand = {
  id: string;
  cards: Card[];
  bet: number;
  stood: boolean;
  busted: boolean;
  doubled: boolean;
  blackjack: boolean;
  result?: RoundResult;
};

export type RoundResult = 'win' | 'lose' | 'push' | 'blackjack';

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
  if (player.isBust) {
    return 'lose';
  }

  if (dealer.isBust) {
    return player.isBlackjack ? 'blackjack' : 'win';
  }

  if (player.isBlackjack && !dealer.isBlackjack) {
    return 'blackjack';
  }

  if (!player.isBlackjack && dealer.isBlackjack) {
    return 'lose';
  }

  if (player.total > dealer.total) {
    return 'win';
  }

  if (player.total < dealer.total) {
    return 'lose';
  }

  return 'push';
}

export function canDouble(hand: Hand, phase: 'player' | 'dealer' | 'round-over'): boolean {
  return phase === 'player' && hand.cards.length === 2 && !hand.stood && !hand.busted;
}

export function canSplit(hand: Hand, phase: 'player' | 'dealer' | 'round-over', handCount: number): boolean {
  if (phase !== 'player' || hand.cards.length !== 2 || handCount >= 2) {
    return false;
  }

  return splitValue(hand.cards[0]) === splitValue(hand.cards[1]);
}

function splitValue(card: Card): string {
  return TEN_VALUE_RANKS.includes(card.rank) ? '10' : card.rank;
}

export function getRecommendation(hand: Hand, dealerUpCard: Card): Recommendation {
  const summary = summarizeHand(hand.cards);
  const dealerValue = dealerUpCard.rank === 'A' ? 11 : rankValue(dealerUpCard.rank);

  if (canRecommendSplit(hand)) {
    const splitAdvice = getPairRecommendation(splitValue(hand.cards[0]), dealerValue);
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
  return hand.cards.length === 2 && splitValue(hand.cards[0]) === splitValue(hand.cards[1]);
}

function getPairRecommendation(pairValue: string, dealerValue: number): Recommendation | null {
  if (pairValue === 'A' || pairValue === '8') {
    return {
      action: 'Split',
      reason: 'A-A와 8-8은 PDF 기본 전략 표에서도 가장 우선적인 분할 케이스입니다.',
    };
  }

  if (pairValue === '10') {
    return {
      action: 'Stand',
      reason: '10점 페어는 이미 강한 20이므로 분할보다 스탠드가 유리합니다.',
    };
  }

  if (pairValue === '9') {
    return dealerValue >= 7 && dealerValue !== 8 && dealerValue !== 9
      ? {
          action: 'Stand',
          reason: '9-9는 7, 10, A 상대로는 스탠드가 더 안정적입니다.',
        }
      : {
          action: 'Split',
          reason: '9-9는 2-6, 8-9 상대로 분할해 강한 두 손패로 만드는 편이 좋습니다.',
        };
  }

  if (pairValue === '7') {
    return dealerValue <= 7
      ? {action: 'Split', reason: '7-7은 약한 딜러 업카드 상대로 분할이 권장됩니다.'}
      : {action: 'Hit', reason: '7-7은 강한 딜러 업카드 상대로 분할 이득이 줄어 히트가 안전합니다.'};
  }

  if (pairValue === '6') {
    return dealerValue <= 6
      ? {action: 'Split', reason: '6-6은 2-6 상대로 분할하는 기본 전략 구간입니다.'}
      : {action: 'Hit', reason: '6-6은 7 이상 상대로 분할보다 히트가 낫습니다.'};
  }

  if (pairValue === '5') {
    return dealerValue <= 9
      ? {action: 'Double', reason: '5-5는 10점 한 손패로 보고 2-9 상대로 더블을 노립니다.'}
      : {action: 'Hit', reason: '5-5는 10 또는 A 상대로 더블보다 히트가 안전합니다.'};
  }

  if (pairValue === '4') {
    return {action: 'Hit', reason: '4-4는 이번 테이블에서는 분할보다 히트 기준으로 처리합니다.'};
  }

  if (pairValue === '3' || pairValue === '2') {
    return dealerValue <= 7
      ? {action: 'Split', reason: `${pairValue}-${pairValue}는 2-7 상대로 분할이 권장됩니다.`}
      : {action: 'Hit', reason: `${pairValue}-${pairValue}는 강한 업카드 상대로 분할보다 히트가 낫습니다.`};
  }

  return null;
}

function getSoftRecommendation(total: number, dealerValue: number): Recommendation {
  if (total <= 17) {
    if (total === 17 && dealerValue >= 3 && dealerValue <= 6) {
      return {
        action: 'Double',
        reason: '소프트 17(A,6)은 3-6 상대로 더블다운 구간입니다.',
      };
    }

    if (total === 18 && dealerValue >= 3 && dealerValue <= 6) {
      return {
        action: 'Double',
        reason: '소프트 18(A,7)은 약한 업카드 상대로 더블 기회가 납니다.',
      };
    }

    return {
      action: 'Hit',
      reason: '소프트 핸드는 버스트 여지가 낮아 더 높은 합을 노리는 히트가 기본입니다.',
    };
  }

  if (total === 18) {
    return dealerValue >= 9 || dealerValue === 11
      ? {
          action: 'Hit',
          reason: '소프트 18은 9, 10, A 상대로 스탠드보다 히트가 낫습니다.',
        }
      : {
          action: 'Stand',
          reason: '소프트 18은 중간 이하 업카드 상대로 이미 충분히 강한 스탠드 구간입니다.',
        };
  }

  return {
    action: 'Stand',
    reason: '소프트 19 이상은 추가 리스크 없이 스탠드가 기본입니다.',
  };
}

function getHardRecommendation(total: number, dealerValue: number): Recommendation {
  if (total <= 8) {
    return {
      action: 'Hit',
      reason: '8 이하 하드 핸드는 더 키워야 해서 히트가 기본입니다.',
    };
  }

  if (total === 9) {
    return dealerValue >= 3 && dealerValue <= 6
      ? {action: 'Double', reason: '하드 9는 3-6 상대로 더블다운 기대값이 좋습니다.'}
      : {action: 'Hit', reason: '하드 9는 강한 업카드 상대로 아직 히트가 우선입니다.'};
  }

  if (total === 10) {
    return dealerValue <= 9
      ? {action: 'Double', reason: '하드 10은 2-9 상대로 더블다운 핵심 구간입니다.'}
      : {action: 'Hit', reason: '하드 10은 10 또는 A 상대로 더블보다 히트가 안전합니다.'};
  }

  if (total === 11) {
    return {
      action: 'Double',
      reason: '하드 11은 PDF 전략표와 일반 기본 전략 모두에서 대표적인 더블다운 구간입니다.',
    };
  }

  if (total === 12) {
    return dealerValue >= 4 && dealerValue <= 6
      ? {action: 'Stand', reason: '하드 12는 4-6 상대로 딜러 버스트를 기다리는 편이 낫습니다.'}
      : {action: 'Hit', reason: '하드 12는 2-3 또는 7 이상 상대로 히트가 기본입니다.'};
  }

  if (total >= 13 && total <= 16) {
    return dealerValue <= 6
      ? {action: 'Stand', reason: '13-16은 약한 업카드 상대로 스탠드가 기본입니다.'}
      : {action: 'Hit', reason: '13-16은 7 이상 상대로 히트가 권장됩니다.'};
  }

  return {
    action: 'Stand',
    reason: '하드 17 이상은 추가 히트 리스크가 너무 커서 스탠드합니다.',
  };
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
  if (rank === 'A') {
    return 'A';
  }

  if (TEN_VALUE_RANKS.includes(rank)) {
    return '10/J/Q/K';
  }

  return rank;
}

export function formatResult(result?: RoundResult): string {
  if (result === 'blackjack') {
    return '블랙잭';
  }

  if (result === 'win') {
    return '승리';
  }

  if (result === 'lose') {
    return '패배';
  }

  if (result === 'push') {
    return '무승부';
  }

  return '진행 중';
}
