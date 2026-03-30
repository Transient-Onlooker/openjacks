import {
  ChevronRight,
  Cpu,
  History,
  Info,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import {motion} from 'motion/react';
import type {ReactNode} from 'react';

type CardData = {
  value?: string;
  suit?: 'S' | 'H' | 'D' | 'C';
  hidden?: boolean;
};

const dealerHand: CardData[] = [
  {value: 'A', suit: 'S'},
  {hidden: true},
];

const playerHand: CardData[] = [
  {value: '10', suit: 'C'},
  {value: 'J', suit: 'C'},
];

const stats = [
  {label: 'Hands Played', value: '142'},
  {label: 'Win Rate', value: '48.2%'},
  {label: 'Perfect Moves', value: '134/142'},
  {label: 'Mistakes', value: '8', color: 'text-rose-400'},
];

export default function App() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#153725_0%,_#08110c_45%,_#040706_100%)] text-zinc-100 selection:bg-emerald-500/30">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.08),transparent_35%,rgba(250,204,21,0.05)_70%,transparent)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
              <Zap className="h-5 w-5 fill-current text-black" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">
                Training Table
              </p>
              <h1 className="text-lg font-black uppercase tracking-[0.2em] text-white">
                Openjacks
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <Metric label="Balance" value="$10,000.00" accent="text-emerald-300" />
            <Metric label="Streak" value="7 Wins" accent="text-amber-300" />
            <Metric label="Accuracy" value="94.2%" accent="text-white" />
          </div>

          <div className="flex items-center gap-2">
            <IconButton icon={<History className="h-5 w-5" />} />
            <IconButton icon={<Settings className="h-5 w-5" />} />
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-12">
        <section className="flex flex-col gap-6 lg:col-span-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[#0d2c1f] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)] opacity-90" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%,transparent_75%,rgba(0,0,0,0.25))]" />
            <div className="relative flex min-h-[34rem] flex-col justify-between gap-8 rounded-[1.6rem] border border-white/8 px-4 py-8 sm:px-8">
              <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-center opacity-20 md:block">
                <p className="text-5xl font-black uppercase tracking-[0.16em] text-white">Blackjack</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.6em] text-white/80">
                  Pays 3 To 2
                </p>
                <div className="mx-auto mt-5 h-px w-56 bg-white/40" />
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.4em] text-white/80">
                  Dealer stands on all 17s
                </p>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-4">
                <Badge icon={<Cpu className="h-3 w-3" />} label="Dealer" value="17" tone="slate" />
                <div className="flex gap-3">
                  {dealerHand.map((card, index) => (
                    <TableCard
                      key={`dealer-${index}`}
                      value={card.value}
                      suit={card.suit}
                      hidden={card.hidden}
                      delay={index * 0.08}
                    />
                  ))}
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="flex gap-3">
                  {playerHand.map((card, index) => (
                    <TableCard
                      key={`player-${index}`}
                      value={card.value}
                      suit={card.suit}
                      hidden={card.hidden}
                      delay={0.16 + index * 0.08}
                    />
                  ))}
                </div>
                <Badge icon={<User className="h-3 w-3" />} label="Player" value="20" tone="emerald" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ActionButton label="Hit" sub="Draw card" />
            <ActionButton label="Stand" sub="End turn" />
            <ActionButton label="Double" sub="2x bet" />
            <ActionButton label="Split" sub="Unavailable" disabled />
          </div>

          <button className="self-center rounded-2xl bg-emerald-500 px-12 py-4 text-sm font-black uppercase tracking-[0.35em] text-black transition hover:bg-emerald-400 active:scale-[0.98]">
            Deal Hand
          </button>
        </section>

        <aside className="flex flex-col gap-6 lg:col-span-4">
          <Panel
            title="Strategy Advisor"
            icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
            badge="ACTIVE"
          >
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/8 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-300">
                Recommended Move
              </p>
              <p className="mt-2 text-3xl font-black uppercase tracking-[0.18em] text-white">Stand</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Hard 20 against a dealer ace-up line is still a stand. The current edge remains
                strongly positive without exposing the hand to bust risk.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SmallMetric label="EV" value="+0.76" color="text-emerald-300" />
              <SmallMetric label="Risk" value="Low" color="text-zinc-100" />
            </div>
          </Panel>

          <Panel title="Session Insights" icon={<Trophy className="h-5 w-5 text-amber-300" />}>
            <div className="space-y-5">
              {stats.map((stat) => (
                <StatRow
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  color={stat.color ?? 'text-zinc-100'}
                />
              ))}
            </div>

            <button className="mt-6 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/8">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">
                View Full History
              </span>
              <ChevronRight className="h-4 w-4 text-emerald-300" />
            </button>
          </Panel>
        </aside>
      </main>

      <footer className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/8 px-4 py-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500 md:flex-row">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <Info className="h-3 w-3" />
            Practice Mode
          </span>
          <span>v1.0.4</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="transition hover:text-zinc-300">
            Terms
          </a>
          <a href="#" className="transition hover:text-zinc-300">
            Privacy
          </a>
          <span className="text-emerald-300">Openjacks Arena 2026</span>
        </div>
      </footer>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function IconButton({icon}: {icon: ReactNode}) {
  return (
    <button className="rounded-full border border-white/8 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white">
      {icon}
    </button>
  );
}

function Badge({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'slate' | 'emerald';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
      : 'border-white/10 bg-black/30 text-zinc-300';

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur ${toneClass}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-[0.28em]">{label}</span>
      <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-white">{value}</span>
    </div>
  );
}

function TableCard({value, suit, hidden, delay}: CardData & {delay: number}) {
  if (hidden) {
    return (
      <motion.div
        initial={{y: 16, opacity: 0}}
        animate={{y: 0, opacity: 1}}
        transition={{delay}}
        className="relative flex h-28 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_2px,transparent_2px,transparent_10px)] opacity-20" />
        <div className="flex h-16 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
          <Zap className="h-6 w-6 text-emerald-300" />
        </div>
      </motion.div>
    );
  }

  const suitSymbol = suit === 'S' ? 'Sp' : suit === 'H' ? 'He' : suit === 'D' ? 'Di' : 'Cl';
  const isRed = suit === 'H' || suit === 'D';

  return (
    <motion.div
      initial={{y: 16, opacity: 0, rotate: -4}}
      animate={{y: 0, opacity: 1, rotate: 0}}
      transition={{delay}}
      className="group relative flex h-28 w-20 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl bg-white p-2 text-zinc-900 shadow-2xl transition hover:-translate-y-2"
    >
      <div className={`text-lg font-black leading-none ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}>
        {value}
        <div className="text-xs">{suitSymbol}</div>
      </div>
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-10 transition group-hover:scale-110 ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}
      >
        {suitSymbol}
      </div>
      <div
        className={`self-end rotate-180 text-lg font-black leading-none ${isRed ? 'text-rose-600' : 'text-zinc-900'}`}
      >
        {value}
        <div className="text-xs">{suitSymbol}</div>
      </div>
    </motion.div>
  );
}

function ActionButton({
  label,
  sub,
  disabled = false,
}: {
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`rounded-2xl border px-4 py-4 text-center transition ${
        disabled
          ? 'cursor-not-allowed border-white/6 bg-white/4 opacity-35'
          : 'border-white/10 bg-black/20 hover:border-emerald-400/30 hover:bg-white/8'
      }`}
    >
      <p className="text-sm font-black uppercase tracking-[0.24em] text-white">{label}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{sub}</p>
    </button>
  );
}

function Panel({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: ReactNode;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-black/25 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-black uppercase tracking-[0.24em] text-white">{title}</h2>
        </div>
        {badge ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SmallMetric({
  label,
  value,
  color,
}: {
  key?: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      <p className={`mt-2 font-mono text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/6 pb-4 last:border-b-0 last:pb-0">
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</span>
      <span className={`font-mono text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
