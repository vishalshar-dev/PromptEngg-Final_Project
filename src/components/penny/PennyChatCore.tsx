import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { AppSection } from '../ui/AppShell';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import {
  buildPennyContextSnapshot,
  describePennyStyle,
  normalizePennyProposals,
  parseQuickExpenseLocally,
} from '../../utils/pennyEngine';
import { executePennyProposal } from '../../utils/pennyActions';
import {
  fetchGeminiHealth,
  getCachedGeminiConfigured,
  markGeminiConfigured,
} from '../../utils/aiReadiness';
import type {
  PennyChatMessage,
  PennyProposedAction,
  PennyTonePreference,
  WarRoomPeriod,
} from '../../types/models';

interface ParsedQuickExpense {
  name: string;
  amount: number;
  category: string;
  date: string;
  isSplitHint?: boolean;
  splitPersonHint?: string;
  isOfflineFallback?: boolean;
}

interface PennyChatCoreProps {
  activeScreen: AppSection;
  onNavigate?: (section: AppSection, subTab?: string) => void;
  compact?: boolean;
  inputId?: string;
}

const VIBE_OPTIONS: Array<{ id: PennyTonePreference; label: string }> = [
  { id: 'auto', label: 'Auto Adapt' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'crisp', label: 'Crisp' },
  { id: 'strict_coach', label: 'Strict Coach' },
];

function getContextPrompts(activeScreen: AppSection, hasCartItems: boolean): string[] {
  if (activeScreen === 'shopping') {
    return hasCartItems
      ? [
          'Can I safely afford my current cart today?',
          'Build me a dinner cart under ₹250 from Quick Mart',
          'Which saved basket saves me money right now?',
          'Add my due recurring items to cart',
        ]
      : [
          'Build me a breakfast cart under ₹200',
          'What recurring refills are due or overdue?',
          'Suggest a frugal grocery combo this week',
          'Log ₹120 snacks expense for me',
        ];
  }
  if (activeScreen === 'expenses') {
    return [
      'Who do I owe in Splits right now?',
      'Split ₹600 dinner equally with Rahul',
      'Log ₹180 cold coffee under Snacks',
      'How much can I safely spend daily this month?',
    ];
  }
  if (activeScreen === 'wellness') {
    return [
      'Should I turn Broke Mode on right now?',
      'Set a ₹1200 monthly cap for Junk food',
      'What is hurting my discipline score this month?',
      'How much safe money is left after bills?',
    ];
  }
  return [
    'What upcoming payments & refills do I have?',
    'Build a quick grocery cart under ₹200',
    'Who do I owe in Splits right now?',
    'How much can I safely spend per day?',
  ];
}

function getProposalBadgeIcon(type: PennyProposedAction['type']) {
  switch (type) {
    case 'build_cart':
    case 'load_basket':
    case 'add_due_recurring':
      return <ShoppingCart className="w-3.5 h-3.5 text-[#365FE8] shrink-0" />;
    case 'add_split':
    case 'settle_split':
      return <Users className="w-3.5 h-3.5 text-[#365FE8] shrink-0" />;
    case 'set_budget':
    case 'set_category_limit':
    case 'toggle_broke_mode':
      return <Wallet className="w-3.5 h-3.5 text-[#365FE8] shrink-0" />;
    default:
      return <Sparkles className="w-3.5 h-3.5 text-[#365FE8] shrink-0" />;
  }
}

export function PennyChatCore({
  activeScreen,
  onNavigate,
  compact = false,
  inputId = 'penny-chat-input',
}: PennyChatCoreProps) {
  const items = useAppStore((s) => s.items);
  const transactions = useAppStore((s) => s.transactions);
  const purchaseHistory = useAppStore((s) => s.purchaseHistory);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const categories = useAppStore((s) => s.categories);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const categoryLimits = useAppStore((s) => s.categoryLimits);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const basketTemplates = useAppStore((s) => s.basketTemplates);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const savedAudits = useAppStore((s) => s.savedAudits);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const brokeModeConfig = useAppStore((s) => s.brokeModeConfig);
  const disciplineCheckIns = useAppStore((s) => s.disciplineCheckIns);

  const pennyMessages = useAppStore((s) => s.pennyMessages);
  const pennyProfile = useAppStore((s) => s.pennyProfile);
  const appendPennyMessage = useAppStore((s) => s.appendPennyMessage);
  const recordUserInteractionForPenny = useAppStore((s) => s.recordUserInteractionForPenny);
  const setPennyProposalStatus = useAppStore((s) => s.setPennyProposalStatus);
  const setPennyTonePreference = useAppStore((s) => s.setPennyTonePreference);
  const clearPennyMessages = useAppStore((s) => s.clearPennyMessages);
  const addTransaction = useAppStore((s) => s.addTransaction);

  const [mode, setMode] = useState<'chat' | 'quick_log'>('chat');
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(() =>
    getCachedGeminiConfigured()
  );
  const [proposalDrafts, setProposalDrafts] = useState<Record<string, PennyProposedAction>>({});
  const [quickText, setQuickText] = useState('');
  const [isParsingExpense, setIsParsingExpense] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedDraft, setParsedDraft] = useState<ParsedQuickExpense | null>(null);
  const [quickSavedMsg, setQuickSavedMsg] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void fetchGeminiHealth().then((status) => {
      if (active) setGeminiConfigured(status.geminiConfigured);
    });
    return () => {
      active = false;
    };
  }, []);

  const ensureGeminiConfigured = async (): Promise<boolean> => {
    if (geminiConfigured === true) return true;
    const status = await fetchGeminiHealth(true);
    setGeminiConfigured(status.geminiConfigured);
    return status.geminiConfigured;
  };

  const chatVoice = useVoiceInput({
    onFinalTranscript: (spoken) => {
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
      setChatError(null);
    },
  });

  const quickVoice = useVoiceInput({
    onFinalTranscript: (spoken) => {
      setQuickText((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
      setParseError(null);
    },
  });

  const pennyContext = useMemo(
    () =>
      buildPennyContextSnapshot({
        items,
        transactions,
        purchaseHistory,
        totalBudget,
        categories,
        categoryCaps,
        categoryLimits,
        people,
        sharedExpenses,
        settlements,
        basketTemplates,
        priceObservations,
        savedAudits,
        isBrokeMode,
        brokeModeConfig,
        disciplineCheckIns,
        activeScreen,
      }),
    [
      items,
      transactions,
      purchaseHistory,
      totalBudget,
      categories,
      categoryCaps,
      categoryLimits,
      people,
      sharedExpenses,
      settlements,
      basketTemplates,
      priceObservations,
      savedAudits,
      isBrokeMode,
      brokeModeConfig,
      disciplineCheckIns,
      activeScreen,
    ]
  );

  const hasCartItems = pennyContext.currentCart.lineCount > 0;
  const starterPrompts = useMemo(
    () => getContextPrompts(activeScreen, hasCartItems),
    [activeScreen, hasCartItems]
  );

  const liveStyleSummary = useMemo(
    () => describePennyStyle(pennyProfile, isBrokeMode),
    [pennyProfile, isBrokeMode]
  );

  const showTempBanner = (msg: string) => {
    setActionBanner(msg);
    setTimeout(() => {
      setActionBanner((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const getEffectiveProposal = (proposal: PennyProposedAction): PennyProposedAction =>
    proposalDrafts[proposal.id] ?? proposal;

  const updateProposalDraft = (
    proposal: PennyProposedAction,
    updater: (curr: PennyProposedAction) => PennyProposedAction
  ) => {
    setProposalDrafts((prev) => {
      const curr = prev[proposal.id] ?? proposal;
      return {
        ...prev,
        [proposal.id]: updater(curr),
      };
    });
  };

  const handleConfirmProposal = (messageId: string, proposal: PennyProposedAction) => {
    const resolved = getEffectiveProposal(proposal);
    const result = executePennyProposal(resolved, onNavigate);
    if (result.ok) {
      setPennyProposalStatus(messageId, proposal.id, 'applied', result.message);
      setProposalDrafts((prev) => {
        if (!(proposal.id in prev)) return prev;
        const copy = { ...prev };
        delete copy[proposal.id];
        return copy;
      });
      showTempBanner(result.message);
    } else {
      setChatError(result.message);
    }
  };

  const handleDismissProposal = (messageId: string, proposalId: string) => {
    setPennyProposalStatus(messageId, proposalId, 'dismissed');
  };

  const tryAppendOfflineChatFallback = (questionText: string): boolean => {
    const localProposal = parseQuickExpenseLocally(
      questionText,
      categories,
      pennyContext.asOfDate
    );
    if (localProposal) {
      const assistantMsg: PennyChatMessage = {
        id: `a-offline-${Date.now()}`,
        role: 'assistant',
        text: 'Gemini AI is on standby (offline parser active), so I parsed this expense locally for you to review and confirm:',
        highlights: [{ label: 'Mode', value: 'Offline instant parse' }],
        proposedActions: [localProposal],
        followUpQuestions: [],
        timestamp: new Date().toISOString(),
        pageContext: activeScreen,
      };
      appendPennyMessage(assistantMsg);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
      return true;
    }

    const topCats = pennyContext.categoryBreakdownThisMonth
      .slice(0, 3)
      .map((c) => `${c.category} (₹${formatCurrencyExact(c.spent)})`)
      .join(', ');
    const summaryText =
      `Live Gemini reasoning isn't enabled yet (add GEMINI_API_KEY in Settings > Secrets for full AI answers). ` +
      `Here is your live offline snapshot right now:\n` +
      `• Month spent: ₹${formatCurrencyExact(pennyContext.budgetOverview.currentMonthSpent)} of ₹${formatCurrencyExact(pennyContext.budgetOverview.monthlyBudget)} (${pennyContext.budgetOverview.budgetUsedPct}% used, ₹${formatCurrencyExact(pennyContext.budgetOverview.rawRemainingBudget)} left)\n` +
      `• Active cart: ${pennyContext.currentCart.lineCount} item${pennyContext.currentCart.lineCount === 1 ? '' : 's'} (₹${formatCurrencyExact(pennyContext.currentCart.totalAmount)})\n` +
      (topCats ? `• Top categories: ${topCats}` : '• Switch to Quick Log anytime to log expenses in plain English.');

    const assistantMsg: PennyChatMessage = {
      id: `a-offline-summary-${Date.now()}`,
      role: 'assistant',
      text: summaryText,
      highlights: [
        { label: 'Remaining', value: `₹${formatCurrencyExact(pennyContext.budgetOverview.rawRemainingBudget)}` },
        { label: 'Cart Total', value: `₹${formatCurrencyExact(pennyContext.currentCart.totalAmount)}` },
        { label: 'Mode', value: 'Offline Snapshot' },
      ],
      proposedActions: [],
      followUpQuestions: [],
      timestamp: new Date().toISOString(),
      pageContext: activeScreen,
    };
    appendPennyMessage(assistantMsg);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
    return true;
  };

  const handleAskPenny = async (promptOverride?: string) => {
    const questionText = (promptOverride ?? input).trim();
    if (!questionText || isAsking) return;

    setChatError(null);
    const updatedProfile = recordUserInteractionForPenny(questionText);

    const userMsg: PennyChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: questionText,
      timestamp: new Date().toISOString(),
      pageContext: activeScreen,
    };

    const recentHistory = pennyMessages
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    appendPennyMessage(userMsg);
    if (!promptOverride) setInput('');
    setIsAsking(true);

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);

    try {
      const configured = await ensureGeminiConfigured();
      if (!configured) {
        if (tryAppendOfflineChatFallback(questionText)) {
          return;
        }
        throw new Error(
          'Gemini AI is not configured right now. Add GEMINI_API_KEY in Settings > Secrets or use Quick Log for instant offline expense parsing.'
        );
      }

      const res = await fetch('/api/penny-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          history: recentHistory,
          context: pennyContext,
          personalityProfile: updatedProfile,
        }),
      });

      const payload = (await res.json()) as {
        answer?: string;
        highlights?: Array<{ label: string; value: string }>;
        proposedActions?: unknown;
        followUpQuestions?: string[];
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        if (res.status === 503 && payload.code === 'MISSING_API_KEY') {
          setGeminiConfigured(false);
          markGeminiConfigured(false);
          if (tryAppendOfflineChatFallback(questionText)) {
            return;
          }
        }
        throw new Error(payload.error || `Penny could not respond (${res.status}).`);
      }

      const validatedProposals = normalizePennyProposals(payload.proposedActions, {
        items,
        basketTemplates,
        categories,
      });

      const assistantMsg: PennyChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: payload.answer || 'I reviewed your context, but could not format a reply.',
        highlights: Array.isArray(payload.highlights) ? payload.highlights.slice(0, 3) : [],
        proposedActions: validatedProposals,
        followUpQuestions: Array.isArray(payload.followUpQuestions)
          ? payload.followUpQuestions.slice(0, 3)
          : [],
        timestamp: new Date().toISOString(),
        pageContext: activeScreen,
      };

      appendPennyMessage(assistantMsg);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Could not reach Penny right now.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleParseQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickText.trim();
    if (!text || isParsingExpense) return;

    setParseError(null);
    setQuickSavedMsg(null);
    setIsParsingExpense(true);

    const applyOfflineQuickParse = (raw: string): boolean => {
      const local = parseQuickExpenseLocally(raw, categories, pennyContext.asOfDate);
      if (!local?.expense) return false;
      setParsedDraft({
        name: local.expense.name,
        amount: local.expense.amount,
        category: local.expense.category,
        date: local.expense.date || pennyContext.asOfDate,
        isOfflineFallback: true,
      });
      return true;
    };

    try {
      const configured = await ensureGeminiConfigured();
      if (!configured) {
        if (!applyOfflineQuickParse(text)) {
          setParseError('Include an amount like "Paid 240 for coffee" for offline instant parsing.');
        }
        return;
      }

      const res = await fetch('/api/penny-parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          categories,
          todayDate: pennyContext.asOfDate,
        }),
      });

      const payload = (await res.json()) as ParsedQuickExpense & { error?: string; code?: string };
      if (!res.ok) {
        if (res.status === 503 && payload.code === 'MISSING_API_KEY') {
          setGeminiConfigured(false);
          markGeminiConfigured(false);
        }
        if (applyOfflineQuickParse(text)) return;
        throw new Error(payload.error || 'Could not parse expense note.');
      }

      setParsedDraft({
        name: payload.name?.trim() || text,
        amount: Number.isFinite(Number(payload.amount)) ? Number(payload.amount) : 0,
        category:
          payload.category && categories.includes(payload.category)
            ? payload.category
            : categories[0] ?? 'Other Expenses',
        date: payload.date || pennyContext.asOfDate,
        isSplitHint: Boolean(payload.isSplitHint),
        splitPersonHint: payload.splitPersonHint || '',
        isOfflineFallback: false,
      });
    } catch (err) {
      if (applyOfflineQuickParse(text)) return;
      setParseError(err instanceof Error ? err.message : 'Unable to parse expense note.');
    } finally {
      setIsParsingExpense(false);
    }
  };

  const handleSaveParsedExpense = () => {
    if (!parsedDraft) return;
    if (!parsedDraft.name.trim() || !Number.isFinite(parsedDraft.amount) || parsedDraft.amount <= 0) {
      setParseError('Enter a valid title and amount greater than ₹0 before saving.');
      return;
    }

    const isoTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(parsedDraft.date)
      ? `${parsedDraft.date}T12:00:00.000Z`
      : new Date().toISOString();

    addTransaction({
      name: parsedDraft.name.trim(),
      amount: parsedDraft.amount,
      category: parsedDraft.category,
      timestamp: isoTimestamp,
      source: 'manual',
    });

    setQuickSavedMsg(
      `Saved "${parsedDraft.name.trim()}" (₹${formatCurrencyExact(parsedDraft.amount)}) to your ledger.`
    );
    setParsedDraft(null);
    setQuickText('');
    setParseError(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Top Sub-bar: Adaptive Vibe & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E7EAF0] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowVibePicker((v) => !v)}
            aria-expanded={showVibePicker}
            data-testid="penny-vibe-toggle"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#365FE8] hover:text-[#294FCC] truncate"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{liveStyleSummary}</span>
          </button>
          {geminiConfigured !== null && (
            <span
              data-testid="penny-ai-status"
              title={
                geminiConfigured
                  ? 'Connected to Gemini AI'
                  : 'Offline instant parser active — set GEMINI_API_KEY in Settings > Secrets for live AI'
              }
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border whitespace-nowrap ${
                geminiConfigured
                  ? 'bg-[#E8F7F1] text-[#0D5E43] border-[#B7E4D3]'
                  : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  geminiConfigured ? 'bg-[#15966B]' : 'bg-[#94A0B4]'
                }`}
              />
              {geminiConfigured ? 'Live AI' : 'Offline Mode'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pennyMessages.length > 0 && mode === 'chat' && (
            <button
              type="button"
              onClick={() => {
                clearPennyMessages();
                setChatError(null);
              }}
              aria-label="Clear Penny chat"
              className="text-[11px] font-semibold text-[#697386] hover:text-[#151922] inline-flex items-center gap-1 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          <div
            role="group"
            aria-label="Penny mode"
            className="inline-flex items-center p-0.5 rounded-xl bg-[#F1F3F6] border border-[#E7EAF0]"
          >
            <button
              type="button"
              onClick={() => setMode('chat')}
              aria-pressed={mode === 'chat'}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold whitespace-nowrap transition-colors ${
                mode === 'chat'
                  ? 'bg-white text-[#151922] shadow-xs'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMode('quick_log')}
              aria-pressed={mode === 'quick_log'}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold whitespace-nowrap transition-colors ${
                mode === 'quick_log'
                  ? 'bg-white text-[#151922] shadow-xs'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              Quick Log
            </button>
          </div>
        </div>
      </div>

      {/* Inline Personality Override Bar (collapsible) */}
      {showVibePicker && (
        <div className="surface-subtle p-2.5 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#697386]">
              Penny adapts automatically ({pennyProfile.messageCount}{' '}
              {pennyProfile.messageCount === 1 ? 'chat' : 'chats'}). Override anytime:
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {VIBE_OPTIONS.map((opt) => {
              const active = pennyProfile.tonePreference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPennyTonePreference(opt.id)}
                  aria-pressed={active}
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold text-center whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#365FE8] border-[#365FE8] text-white'
                      : 'bg-white border-[#E7EAF0] text-[#4B5565] hover:text-[#151922]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {actionBanner && (
        <div
          role="status"
          className="rounded-xl px-3 py-2 bg-[#E8F7F1] border border-[#B7E4D3] text-[#0D5E43] text-xs font-semibold flex items-center justify-between gap-2 shrink-0"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{actionBanner}</span>
          </span>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('shopping', 'home')}
              className="underline whitespace-nowrap shrink-0"
            >
              View Cart
            </button>
          )}
        </div>
      )}

      {mode === 'chat' ? (
        <>
          {/* Starter Prompts when chat is empty or in full panel */}
          {pennyMessages.length === 0 && (
            <div className="space-y-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-[#697386]">
                Suggested for this page ({activeScreen})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {starterPrompts.slice(0, compact ? 3 : 4).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isAsking}
                    onClick={() => void handleAskPenny(prompt)}
                    className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium bg-[#F7F8FA] hover:bg-[#EDF2FF] text-[#151922] hover:text-[#365FE8] border border-[#E7EAF0] hover:border-[#D4E0FF] transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Thread */}
          <div
            className={`flex-1 overflow-y-auto scrollbar-thin space-y-3 pr-1 ${
              compact ? 'min-h-[200px]' : 'min-h-[240px] max-h-[400px]'
            }`}
          >
            {pennyMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-5 px-3">
                <div className="w-10 h-10 rounded-xl bg-[#EDF2FF] text-[#365FE8] flex items-center justify-center mb-2.5">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-[13px] font-semibold text-[#151922]">
                  Ask Penny anything — money, meals, cart, splits, or advice
                </p>
                <p className="text-xs text-[#697386] mt-1 max-w-sm leading-relaxed">
                  Penny adapts to your tone, reads your live cart &amp; ledger, and can log expenses, split bills, or build carts with your 1-click confirmation.
                </p>
              </div>
            ) : (
              pennyMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#365FE8] text-white'
                        : 'bg-[#F1F3F6] border border-[#E7EAF0] text-[#151922]'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {msg.highlights && msg.highlights.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#E7EAF0] grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {msg.highlights.map((h, idx) => (
                          <div
                            key={`${msg.id}-h-${idx}`}
                            className="bg-white border border-[#E7EAF0] rounded-lg px-2.5 py-1.5"
                          >
                            <p className="text-[11px] text-[#697386] truncate">{h.label}</p>
                            <p className="text-xs font-bold font-mono tabular-nums text-[#151922] mt-0.5 truncate">
                              {h.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Structured 1-Click Confirmation Action Cards */}
                    {msg.proposedActions && msg.proposedActions.length > 0 && (
                      <div className="mt-2.5 space-y-2">
                        {msg.proposedActions.map((act) => {
                          const draft = getEffectiveProposal(act);
                          const isPending = act.status === 'pending';
                          return (
                            <div
                              key={act.id}
                              data-testid={`penny-proposal-${act.type}`}
                              className="rounded-xl bg-white border border-[#D4E0FF] p-2.5 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="mt-0.5">{getProposalBadgeIcon(act.type)}</span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#151922] leading-snug">
                                      {act.title}
                                    </p>
                                    <p className="text-[11.5px] text-[#697386] leading-snug mt-0.5">
                                      {act.summary}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Inline Editing for Pending Action Proposals */}
                              {isPending && draft.type === 'log_expense' && draft.expense && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-[#E7EAF0]">
                                  <input
                                    type="text"
                                    aria-label="Expense title"
                                    value={draft.expense.name}
                                    onChange={(e) =>
                                      updateProposalDraft(act, (c) => ({
                                        ...c,
                                        expense: { ...c.expense!, name: e.target.value },
                                      }))
                                    }
                                    className="input-field px-2 py-1 text-[11.5px]"
                                  />
                                  <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    aria-label="Expense amount"
                                    value={draft.expense.amount}
                                    onChange={(e) =>
                                      updateProposalDraft(act, (c) => ({
                                        ...c,
                                        expense: {
                                          ...c.expense!,
                                          amount: Number(e.target.value) || 0,
                                        },
                                      }))
                                    }
                                    className="input-field px-2 py-1 text-[11.5px] font-mono tabular-nums"
                                  />
                                  <select
                                    aria-label="Expense category"
                                    value={draft.expense.category}
                                    onChange={(e) =>
                                      updateProposalDraft(act, (c) => ({
                                        ...c,
                                        expense: { ...c.expense!, category: e.target.value },
                                      }))
                                    }
                                    className="input-field px-2 py-1 text-[11.5px]"
                                  >
                                    {categories.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="date"
                                    aria-label="Expense date"
                                    value={draft.expense.date || pennyContext.asOfDate}
                                    onChange={(e) =>
                                      updateProposalDraft(act, (c) => ({
                                        ...c,
                                        expense: { ...c.expense!, date: e.target.value },
                                      }))
                                    }
                                    className="input-field px-2 py-1 text-[11.5px]"
                                  />
                                </div>
                              )}

                              {isPending && draft.type === 'set_budget' && (
                                <div className="pt-1 border-t border-[#E7EAF0]">
                                  <label className="flex items-center gap-2 text-[11px] font-medium text-[#697386]">
                                    <span>Monthly Budget (₹)</span>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      aria-label="Proposed monthly budget"
                                      value={draft.totalBudget ?? 0}
                                      onChange={(e) =>
                                        updateProposalDraft(act, (c) => ({
                                          ...c,
                                          totalBudget: Number(e.target.value) || 0,
                                        }))
                                      }
                                      className="input-field w-28 px-2 py-1 text-[11.5px] font-mono tabular-nums"
                                    />
                                  </label>
                                </div>
                              )}

                              {isPending &&
                                draft.type === 'set_category_limit' &&
                                draft.categoryLimit && (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 border-t border-[#E7EAF0]">
                                    <select
                                      aria-label="Limit category"
                                      value={draft.categoryLimit.category}
                                      onChange={(e) =>
                                        updateProposalDraft(act, (c) => ({
                                          ...c,
                                          categoryLimit: {
                                            ...c.categoryLimit!,
                                            category: e.target.value,
                                          },
                                        }))
                                      }
                                      className="input-field px-2 py-1 text-[11.5px]"
                                    >
                                      {categories.map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      aria-label="Category cap amount"
                                      value={draft.categoryLimit.limitAmount}
                                      onChange={(e) =>
                                        updateProposalDraft(act, (c) => ({
                                          ...c,
                                          categoryLimit: {
                                            ...c.categoryLimit!,
                                            limitAmount: Number(e.target.value) || 0,
                                          },
                                        }))
                                      }
                                      className="input-field px-2 py-1 text-[11.5px] font-mono tabular-nums"
                                    />
                                    <select
                                      aria-label="Category cap period"
                                      value={draft.categoryLimit.period}
                                      onChange={(e) =>
                                        updateProposalDraft(act, (c) => ({
                                          ...c,
                                          categoryLimit: {
                                            ...c.categoryLimit!,
                                            period: e.target.value as WarRoomPeriod,
                                          },
                                        }))
                                      }
                                      className="input-field px-2 py-1 text-[11.5px]"
                                    >
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="monthly">Monthly</option>
                                    </select>
                                  </div>
                                )}

                              {isPending && draft.type === 'add_split' && draft.split && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 border-t border-[#E7EAF0]">
                                  <input
                                    type="text"
                                    aria-label="Split expense title"
                                    value={draft.split.name}
                                    onChange={(e) =>
                                      updateProposalDraft(act, (c) => ({
                                        ...c,
                                        split: { ...c.split!, name: e.target.value },
                                      }))
                                    }
                                    className="input-field px-2 py-1 text-[11.5px]"
                                  />
                                  <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    aria-label="Split total amount"
                                    value={draft.split.totalAmount}
                                    onChange={(e) =>
                                      updateProposalDraft(act, (c) => ({
                                        ...c,
                                        split: {
                                          ...c.split!,
                                          totalAmount: Number(e.target.value) || 0,
                                        },
                                      }))
                                    }
                                    className="input-field px-2 py-1 text-[11.5px] font-mono tabular-nums"
                                  />
                                  <select
                                    aria-label="Split category"
                                    value={draft.split.category}
                                    onChange={(e) =>
                                      updateProposalDraft(act, (c) => ({
                                        ...c,
                                        split: { ...c.split!, category: e.target.value },
                                      }))
                                    }
                                    className="input-field px-2 py-1 text-[11.5px]"
                                  >
                                    {categories.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {act.status === 'applied' ? (
                                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#15966B]">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>{act.appliedMessage || 'Applied'}</span>
                                </div>
                              ) : act.status === 'dismissed' ? (
                                <p className="text-[11px] text-[#929BAB] font-medium">Dismissed</p>
                              ) : (
                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmProposal(msg.id, act)}
                                    className="btn-primary px-3 py-1.5 text-[11.5px] whitespace-nowrap"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {act.type === 'navigate' ? act.title : 'Confirm & Apply'}
                                    </span>
                                    {act.type === 'navigate' && <ArrowRight className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDismissProposal(msg.id, act.id)}
                                    className="btn-secondary px-2.5 py-1.5 text-[11.5px] whitespace-nowrap"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Dismiss</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {msg.role === 'assistant' &&
                    msg.followUpQuestions &&
                    msg.followUpQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {msg.followUpQuestions.map((fq) => (
                          <button
                            key={fq}
                            type="button"
                            disabled={isAsking}
                            onClick={() => void handleAskPenny(fq)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-[#E7EAF0] text-[#365FE8] hover:bg-[#EDF2FF] transition-colors text-left"
                          >
                            {fq}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))
            )}

            {isAsking && (
              <div className="flex items-start">
                <div className="rounded-2xl px-3.5 py-2.5 bg-[#F7F8FA] border border-[#E7EAF0] text-xs text-[#697386]">
                  Penny is thinking…
                </div>
              </div>
            )}

            {chatError && (
              <div
                role="alert"
                className="rounded-xl px-3.5 py-2.5 bg-[#FDECEC] border border-[#F6B8B8] text-[#B93B3B] text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{chatError}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Voice Status / Error */}
          {(chatVoice.isListening || chatVoice.voiceError) && (
            <div
              role={chatVoice.voiceError ? 'alert' : 'status'}
              className={`rounded-xl px-3 py-1.5 text-[11.5px] flex items-center justify-between gap-2 shrink-0 ${
                chatVoice.voiceError
                  ? 'bg-[#FDECEC] border border-[#F6B8B8] text-[#B93B3B]'
                  : 'bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8]'
              }`}
            >
              <span className="truncate">
                {chatVoice.voiceError
                  ? chatVoice.voiceError
                  : chatVoice.interimTranscript
                    ? `Listening: "${chatVoice.interimTranscript}"`
                    : 'Listening… speak naturally to Penny'}
              </span>
              {chatVoice.voiceError && (
                <button
                  type="button"
                  onClick={chatVoice.clearVoiceError}
                  aria-label="Dismiss voice notice"
                  className="shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatVoice.isListening) chatVoice.stopListening();
              void handleAskPenny();
            }}
            className="flex items-center gap-2 pt-2 border-t border-[#E7EAF0] shrink-0"
          >
            <label htmlFor={inputId} className="sr-only">
              Message Penny
            </label>
            <input
              id={inputId}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (chatError) setChatError(null);
              }}
              placeholder={
                chatVoice.isListening
                  ? 'Listening… speak now'
                  : hasCartItems
                    ? `Ask about your ₹${formatCurrencyExact(pennyContext.currentCart.totalAmount)} cart, splits, or anything…`
                    : 'Ask Penny anything or tap the mic…'
              }
              disabled={isAsking}
              className="input-field flex-1 min-w-0 px-3 py-2 text-[13px]"
            />
            <button
              type="button"
              onClick={chatVoice.toggleListening}
              disabled={isAsking}
              data-testid={`${inputId}-mic`}
              aria-label={chatVoice.isListening ? 'Stop voice listening' : 'Speak to Penny'}
              aria-pressed={chatVoice.isListening}
              title={
                chatVoice.isSupported
                  ? chatVoice.isListening
                    ? 'Stop listening'
                    : 'Voice input'
                  : 'Voice input info'
              }
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                chatVoice.isListening
                  ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                  : 'bg-[#F7F8FA] hover:bg-[#EDF2FF] border-[#E7EAF0] text-[#697386] hover:text-[#365FE8]'
              }`}
            >
              {chatVoice.isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            <button
              type="submit"
              disabled={isAsking || !input.trim()}
              aria-label="Send message to Penny"
              className="btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className={compact ? 'hidden sm:inline' : 'inline'}>
                {isAsking ? 'Thinking…' : 'Send'}
              </span>
            </button>
          </form>
        </>
      ) : (
        /* Quick Natural-Language Expense Parser */
        <div className="flex-1 flex flex-col justify-between gap-3 overflow-y-auto scrollbar-thin">
          <div className="space-y-3">
            <p className="text-xs text-[#697386] leading-relaxed">
              Type a quick note like &quot;Paid 240 for coffee&quot; and Penny will prepare a ledger entry for you to confirm.
            </p>

            <form
              onSubmit={(e) => {
                if (quickVoice.isListening) quickVoice.stopListening();
                void handleParseQuickExpense(e);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <label htmlFor={`${inputId}-quick-log`} className="sr-only">
                Describe an expense to log
              </label>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  id={`${inputId}-quick-log`}
                  type="text"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder={
                    quickVoice.isListening
                      ? 'Listening… say e.g. "Paid 240 for coffee"'
                      : 'e.g. "Paid 240 for cold coffee and sandwich"'
                  }
                  disabled={isParsingExpense}
                  className="input-field flex-1 min-w-0 px-3 py-2 text-[13px]"
                />
                <button
                  type="button"
                  onClick={quickVoice.toggleListening}
                  disabled={isParsingExpense}
                  aria-label={quickVoice.isListening ? 'Stop voice note' : 'Dictate expense note'}
                  aria-pressed={quickVoice.isListening}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                    quickVoice.isListening
                      ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                      : 'bg-[#F7F8FA] hover:bg-[#EDF2FF] border-[#E7EAF0] text-[#697386] hover:text-[#365FE8]'
                  }`}
                >
                  {quickVoice.isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                type="submit"
                disabled={isParsingExpense || !quickText.trim()}
                className="btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isParsingExpense ? 'Parsing…' : 'Parse Note'}</span>
              </button>
            </form>

            {(quickVoice.isListening || quickVoice.voiceError) && (
              <div
                role={quickVoice.voiceError ? 'alert' : 'status'}
                className={`rounded-xl px-3 py-1.5 text-[11.5px] flex items-center justify-between gap-2 ${
                  quickVoice.voiceError
                    ? 'bg-[#FDECEC] border border-[#F6B8B8] text-[#B93B3B]'
                    : 'bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8]'
                }`}
              >
                <span>
                  {quickVoice.voiceError
                    ? quickVoice.voiceError
                    : quickVoice.interimTranscript
                      ? `Listening: "${quickVoice.interimTranscript}"`
                      : 'Listening… dictate your expense'}
                </span>
                {quickVoice.voiceError && (
                  <button
                    type="button"
                    onClick={quickVoice.clearVoiceError}
                    aria-label="Dismiss voice notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {parseError && (
              <div
                role="alert"
                className="rounded-xl px-3 py-2 bg-[#FDECEC] border border-[#F6B8B8] text-[#B93B3B] text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {quickSavedMsg && (
              <div
                role="status"
                className="rounded-xl px-3 py-2 bg-[#E8F7F1] border border-[#B7E4D3] text-[#0D5E43] text-xs flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{quickSavedMsg}</span>
                </span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('expenses')}
                    className="font-semibold underline whitespace-nowrap shrink-0"
                  >
                    Ledger
                  </button>
                )}
              </div>
            )}

            {parsedDraft && (
              <div className="surface-subtle p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#151922]">
                      Review &amp; Confirm Expense
                    </p>
                    {parsedDraft.isOfflineFallback && (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF6E7] text-[#9E6614] border border-[#F3D8A8]">
                        Offline instant parse
                      </span>
                    )}
                  </div>
                  {parsedDraft.isSplitHint && parsedDraft.splitPersonHint && onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('expenses')}
                      className="text-[11px] font-semibold text-[#365FE8] hover:text-[#294FCC]"
                    >
                      Split with {parsedDraft.splitPersonHint}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#697386]">Title</span>
                    <input
                      type="text"
                      value={parsedDraft.name}
                      onChange={(e) =>
                        setParsedDraft({ ...parsedDraft, name: e.target.value })
                      }
                      className="input-field w-full px-2.5 py-1.5 text-xs"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#697386]">Amount (₹)</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={parsedDraft.amount || ''}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          amount: Number(e.target.value) || 0,
                        })
                      }
                      className="input-field w-full px-2.5 py-1.5 text-xs font-mono tabular-nums"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#697386]">Category</span>
                    <select
                      value={parsedDraft.category}
                      onChange={(e) =>
                        setParsedDraft({ ...parsedDraft, category: e.target.value })
                      }
                      className="input-field w-full px-2.5 py-1.5 text-xs"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[#697386]">Date</span>
                    <input
                      type="date"
                      value={parsedDraft.date}
                      onChange={(e) =>
                        setParsedDraft({ ...parsedDraft, date: e.target.value })
                      }
                      className="input-field w-full px-2.5 py-1.5 text-xs"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setParsedDraft(null)}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveParsedExpense}
                    className="btn-primary px-3.5 py-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save to Ledger</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
