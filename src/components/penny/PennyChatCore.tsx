import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { AppSection } from '../ui/AppShell';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import {
  answerPennyLocally,
  buildPennyContextSnapshot,
  describePennyStyle,
  normalizePennyProposals,
  parseQuickExpensesLocally,
} from '../../utils/pennyEngine';
import { executePennyProposal } from '../../utils/pennyActions';
import {
  fetchGeminiHealth,
  getCachedAiConfigured,
} from '../../utils/aiReadiness';
import {
  clearLiveAiCooldown,
  enqueueAiPost,
  getLiveAiAvailability,
} from '../../utils/aiClient';
import type {
  PennyChatMessage,
  PennyProposedAction,
  PennyTonePreference,
  WarRoomPeriod,
} from '../../types/models';
import { PennyEmblem } from './PennyEmblem';

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

const VIBE_OPTIONS: Array<{
  id: PennyTonePreference;
  label: string;
  hint: string;
}> = [
  { id: 'auto', label: 'Auto', hint: 'Matches your pace & tone' },
  { id: 'friendly', label: 'Friendly', hint: 'Warm & encouraging' },
  { id: 'crisp', label: 'Crisp', hint: 'Numbers first, ultra brief' },
  { id: 'strict_coach', label: 'Coach', hint: 'Strict cashflow guardrails' },
];

const QUICK_LOG_EXAMPLES = [
  'Paid ₹180 coffee, ₹240 uber, ₹65 milk',
  'Spent ₹450 petrol yesterday & ₹120 snacks',
  'Split ₹600 dinner with Rahul',
];

function getContextPrompts(
  activeScreen: AppSection,
  hasCartItems: boolean
): Array<{ title: string; prompt: string }> {
  if (activeScreen === 'shopping') {
    return hasCartItems
      ? [
          {
            title: 'Cart Affordability',
            prompt: 'Can I safely afford my current cart today?',
          },
          {
            title: 'Dinner Under ₹250',
            prompt: 'Build me a dinner cart under ₹250 from Quick Mart',
          },
          {
            title: 'Saved Baskets',
            prompt: 'Which saved basket saves me money right now?',
          },
          {
            title: 'Due Refills',
            prompt: 'Add my due recurring items to cart',
          },
        ]
      : [
          {
            title: 'Breakfast Under ₹200',
            prompt: 'Build me a breakfast cart under ₹200',
          },
          {
            title: 'Recurring Refills',
            prompt: 'What recurring refills are due or overdue?',
          },
          {
            title: 'Frugal Combo',
            prompt: 'Suggest a frugal grocery combo this week',
          },
          {
            title: 'Quick Expense',
            prompt: 'Log ₹120 snacks expense for me',
          },
        ];
  }
  if (activeScreen === 'expenses') {
    return [
      {
        title: 'Split Balances',
        prompt: 'Who do I owe in Splits right now?',
      },
      {
        title: 'Quick Split',
        prompt: 'Split ₹600 dinner equally with Rahul',
      },
      {
        title: 'Log Snack',
        prompt: 'Log ₹180 cold coffee under Snacks',
      },
      {
        title: 'Daily Safe Spend',
        prompt: 'How much can I safely spend daily this month?',
      },
    ];
  }
  if (activeScreen === 'wellness') {
    return [
      {
        title: 'Broke Mode Check',
        prompt: 'Should I turn Broke Mode on right now?',
      },
      {
        title: 'Category Guardrail',
        prompt: 'Set a ₹1200 monthly cap for Snacks & Beverages',
      },
      {
        title: 'Discipline Audit',
        prompt: 'What is hurting my discipline score this month?',
      },
      {
        title: 'Safe After Bills',
        prompt: 'How much safe money is left after bills?',
      },
    ];
  }
  return [
    {
      title: 'Upcoming Bills',
      prompt: 'What upcoming payments & refills do I have?',
    },
    {
      title: 'Cart Under ₹200',
      prompt: 'Build a quick grocery cart under ₹200',
    },
    {
      title: 'Split Balances',
      prompt: 'Who do I owe in Splits right now?',
    },
    {
      title: 'Daily Safe Limit',
      prompt: 'How much can I safely spend per day?',
    },
  ];
}

function getProposalBadgeIcon(type: PennyProposedAction['type']) {
  switch (type) {
    case 'build_cart':
    case 'load_basket':
    case 'add_due_recurring':
      return <ShoppingCart className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" />;
    case 'add_split':
    case 'settle_split':
      return <Users className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" />;
    case 'set_budget':
    case 'set_category_limit':
    case 'toggle_broke_mode':
      return <Wallet className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" />;
    default:
      return <ArrowRight className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" />;
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
  const replacePennyMessage = useAppStore((s) => s.replacePennyMessage);
  const recordUserInteractionForPenny = useAppStore((s) => s.recordUserInteractionForPenny);
  const setPennyProposalStatus = useAppStore((s) => s.setPennyProposalStatus);
  const setPennyTonePreference = useAppStore((s) => s.setPennyTonePreference);
  const clearPennyMessages = useAppStore((s) => s.clearPennyMessages);
  const pruneOfflinePennyMessages = useAppStore((s) => s.pruneOfflinePennyMessages);
  const addTransaction = useAppStore((s) => s.addTransaction);

  const [mode, setMode] = useState<'chat' | 'quick_log'>('chat');
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(() => {
    if (getLiveAiAvailability().mode !== 'live') return false;
    return getCachedAiConfigured();
  });
  const [liveProvider, setLiveProvider] = useState<'groq' | 'gemini' | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState<number>(() =>
    Math.ceil(getLiveAiAvailability().retryAfterMs / 1000)
  );
  const [proposalDrafts, setProposalDrafts] = useState<Record<string, PennyProposedAction>>({});
  const [quickText, setQuickText] = useState('');
  const [isParsingExpense, setIsParsingExpense] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedDrafts, setParsedDrafts] = useState<ParsedQuickExpense[]>([]);
  const [quickSavedMsg, setQuickSavedMsg] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncAvailabilityState = useCallback(() => {
    const avail = getLiveAiAvailability();
    if (avail.mode === 'live') {
      setCooldownSecs(0);
      return true;
    }
    setCooldownSecs(Math.max(1, Math.ceil(avail.retryAfterMs / 1000)));
    setAiConfigured(false);
    return false;
  }, []);

  const applyHealthStatus = useCallback(
    (status: { aiConfigured: boolean; groqConfigured: boolean; geminiConfigured: boolean }) => {
      setAiConfigured(status.aiConfigured);
      if (status.groqConfigured) {
        setLiveProvider('groq');
      } else if (status.geminiConfigured) {
        setLiveProvider('gemini');
      } else {
        setLiveProvider(null);
      }
      if (status.aiConfigured) {
        pruneOfflinePennyMessages();
      }
    },
    [pruneOfflinePennyMessages]
  );

  const refreshHealth = useCallback(async () => {
    setIsReconnecting(true);
    clearLiveAiCooldown();
    setCooldownSecs(0);
    try {
      const status = await fetchGeminiHealth(true);
      applyHealthStatus(status);
    } finally {
      setIsReconnecting(false);
    }
  }, [applyHealthStatus]);

  useEffect(() => {
    let active = true;
    void fetchGeminiHealth(true).then((status) => {
      if (!active) return;
      if (getLiveAiAvailability().mode !== 'live') {
        syncAvailabilityState();
        return;
      }
      applyHealthStatus(status);
    });

    const onOnlineOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (getLiveAiAvailability().mode !== 'live') {
          syncAvailabilityState();
          return;
        }
        void fetchGeminiHealth(true).then((status) => {
          if (!active) return;
          applyHealthStatus(status);
        });
      }
    };

    window.addEventListener('online', onOnlineOrFocus);
    window.addEventListener('focus', onOnlineOrFocus);
    return () => {
      active = false;
      window.removeEventListener('online', onOnlineOrFocus);
      window.removeEventListener('focus', onOnlineOrFocus);
    };
  }, [applyHealthStatus, syncAvailabilityState]);

  useEffect(() => {
    if (aiConfigured !== false) return;
    const interval = window.setInterval(() => {
      const avail = getLiveAiAvailability();
      if (avail.mode === 'live') {
        setCooldownSecs(0);
        void fetchGeminiHealth(true).then((status) => {
          applyHealthStatus(status);
        });
      } else {
        setCooldownSecs(Math.max(1, Math.ceil(avail.retryAfterMs / 1000)));
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [aiConfigured, applyHealthStatus]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 108)}px`;
  }, [input]);

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

  const appendLocalFallbackReply = (questionText: string) => {
    const localReply = answerPennyLocally({
      question: questionText,
      context: pennyContext,
      items,
      basketTemplates,
      categories,
    });

    const assistantMsg: PennyChatMessage = {
      id: `a-local-${Date.now()}`,
      role: 'assistant',
      text: localReply.answer,
      highlights: localReply.highlights,
      proposedActions: localReply.proposedActions,
      followUpQuestions: localReply.followUpQuestions,
      timestamp: new Date().toISOString(),
      pageContext: activeScreen,
      isLocalFallback: true,
    };
    appendPennyMessage(assistantMsg);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
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

    const availBefore = getLiveAiAvailability();
    if (availBefore.mode !== 'live') {
      syncAvailabilityState();
      appendLocalFallbackReply(questionText);
      return;
    }

    setIsAsking(true);

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);

    try {
      const result = await enqueueAiPost<{
        answer?: string;
        highlights?: Array<{ label: string; value: string }>;
        proposedActions?: unknown;
        followUpQuestions?: string[];
        provider?: 'groq' | 'gemini';
      }>(
        '/api/penny-chat',
        {
          question: questionText,
          history: recentHistory,
          context: pennyContext,
          personalityProfile: updatedProfile,
        },
        { timeoutMs: 20_000 }
      );

      if (!result.ok || typeof result.data.answer !== 'string') {
        syncAvailabilityState();
        appendLocalFallbackReply(questionText);
        return;
      }

      setCooldownSecs(0);
      if (result.data.provider) {
        setLiveProvider(result.data.provider);
      }
      if (aiConfigured !== true) {
        setAiConfigured(true);
        pruneOfflinePennyMessages();
      }

      const validatedProposals = normalizePennyProposals(result.data.proposedActions, {
        items,
        basketTemplates,
        categories,
      });

      const assistantMsg: PennyChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: result.data.answer || 'I reviewed your context, but could not format a reply.',
        highlights: Array.isArray(result.data.highlights) ? result.data.highlights.slice(0, 3) : [],
        proposedActions: validatedProposals,
        followUpQuestions: Array.isArray(result.data.followUpQuestions)
          ? result.data.followUpQuestions.slice(0, 3)
          : [],
        timestamp: new Date().toISOString(),
        pageContext: activeScreen,
        isLocalFallback: false,
      };

      appendPennyMessage(assistantMsg);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    } finally {
      setIsAsking(false);
    }
  };

  const handleRetryMessageWithLiveAi = async (assistantMessageId: string) => {
    if (isAsking || retryingMessageId) return;
    const idx = pennyMessages.findIndex((m) => m.id === assistantMessageId);
    if (idx <= 0) return;

    let matchingQuestion = '';
    for (let i = idx - 1; i >= 0; i -= 1) {
      if (pennyMessages[i].role === 'user') {
        matchingQuestion = pennyMessages[i].text;
        break;
      }
    }
    if (!matchingQuestion) return;

    setChatError(null);
    setRetryingMessageId(assistantMessageId);
    clearLiveAiCooldown();

    const recentHistory = pennyMessages
      .slice(Math.max(0, idx - 8), idx - 1)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const result = await enqueueAiPost<{
        answer?: string;
        highlights?: Array<{ label: string; value: string }>;
        proposedActions?: unknown;
        followUpQuestions?: string[];
        provider?: 'groq' | 'gemini';
      }>(
        '/api/penny-chat',
        {
          question: matchingQuestion,
          history: recentHistory,
          context: pennyContext,
          personalityProfile: pennyProfile,
        },
        { timeoutMs: 20_000, bypassCooldown: true }
      );

      if (!result.ok || typeof result.data.answer !== 'string') {
        syncAvailabilityState();
        showTempBanner('Live AI servers are temporarily busy — kept your Local Engine reply.');
        return;
      }

      setCooldownSecs(0);
      setAiConfigured(true);
      if (result.data.provider) {
        setLiveProvider(result.data.provider);
      }
      const validatedProposals = normalizePennyProposals(result.data.proposedActions, {
        items,
        basketTemplates,
        categories,
      });

      replacePennyMessage(assistantMessageId, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: result.data.answer,
        highlights: Array.isArray(result.data.highlights) ? result.data.highlights.slice(0, 3) : [],
        proposedActions: validatedProposals,
        followUpQuestions: Array.isArray(result.data.followUpQuestions)
          ? result.data.followUpQuestions.slice(0, 3)
          : [],
        timestamp: new Date().toISOString(),
        pageContext: activeScreen,
        isLocalFallback: false,
      });
    } finally {
      setRetryingMessageId(null);
    }
  };

  const handleParseQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickText.trim();
    if (!text || isParsingExpense) return;

    setParseError(null);
    setQuickSavedMsg(null);

    const applyOfflineQuickParse = (raw: string): boolean => {
      const localList = parseQuickExpensesLocally(raw, categories, pennyContext.asOfDate);
      if (localList.length === 0) return false;
      setParsedDrafts(
        localList
          .filter((item) => Boolean(item.expense))
          .map((item) => ({
            name: item.expense!.name,
            amount: item.expense!.amount,
            category: item.expense!.category,
            date: item.expense!.date || pennyContext.asOfDate,
            isOfflineFallback: true,
          }))
      );
      return true;
    };

    if (getLiveAiAvailability().mode !== 'live') {
      syncAvailabilityState();
      if (!applyOfflineQuickParse(text)) {
        setParseError('Include amounts like "Paid 180 for coffee, 240 for uber" so Penny can log them.');
      }
      return;
    }

    setIsParsingExpense(true);

    try {
      const result = await enqueueAiPost<{
        expenses?: ParsedQuickExpense[];
        name?: string;
        amount?: number;
        category?: string;
        date?: string;
        isSplitHint?: boolean;
        splitPersonHint?: string;
        provider?: 'groq' | 'gemini';
      }>(
        '/api/penny-parse-expense',
        {
          text,
          categories,
          todayDate: pennyContext.asOfDate,
        },
        { timeoutMs: 15_000 }
      );

      if (!result.ok) {
        syncAvailabilityState();
        if (applyOfflineQuickParse(text)) return;
        setParseError(
          result.error || 'Include amounts like "Paid 180 for coffee, 240 for uber" so Penny can log them.'
        );
        return;
      }

      setCooldownSecs(0);
      if (result.data.provider) {
        setLiveProvider(result.data.provider);
      }
      if (aiConfigured !== true) {
        setAiConfigured(true);
        pruneOfflinePennyMessages();
      }

      const payload = result.data;
      const rawItems =
        Array.isArray(payload.expenses) && payload.expenses.length > 0
          ? payload.expenses
          : Number(payload.amount) > 0
            ? [
                {
                  name: payload.name || text,
                  amount: Number(payload.amount),
                  category: payload.category || categories[0] || 'Other Expenses',
                  date: payload.date || pennyContext.asOfDate,
                  isSplitHint: payload.isSplitHint,
                  splitPersonHint: payload.splitPersonHint,
                },
              ]
            : [];

      const normalizedDrafts: ParsedQuickExpense[] = rawItems
        .map((item) => ({
          name: item.name?.trim() || text,
          amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
          category:
            item.category && categories.includes(item.category)
              ? item.category
              : categories[0] ?? 'Other Expenses',
          date: item.date || pennyContext.asOfDate,
          isSplitHint: Boolean(item.isSplitHint),
          splitPersonHint: item.splitPersonHint || '',
          isOfflineFallback: false,
        }))
        .filter((item) => item.amount > 0);

      if (normalizedDrafts.length === 0) {
        if (!applyOfflineQuickParse(text)) {
          setParseError('No amounts detected. Try e.g. "Paid 180 coffee, 240 uber, 65 milk".');
        }
        return;
      }

      setParsedDrafts(normalizedDrafts);
    } finally {
      setIsParsingExpense(false);
    }
  };

  const updateParsedDraftAt = (index: number, patch: Partial<ParsedQuickExpense>) => {
    setParsedDrafts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const removeParsedDraftAt = (index: number) => {
    setParsedDrafts((prev) => prev.filter((_, idx) => idx !== index));
    setParseError(null);
  };

  const handleAddEmptyQuickRow = () => {
    setParsedDrafts((prev) => [
      ...prev,
      {
        name: '',
        amount: 0,
        category: categories[0] ?? 'Other Expenses',
        date: pennyContext.asOfDate,
      },
    ]);
  };

  const handleSaveParsedExpenses = () => {
    if (parsedDrafts.length === 0) return;

    const invalidIdx = parsedDrafts.findIndex(
      (d) => !d.name.trim() || !Number.isFinite(d.amount) || d.amount <= 0
    );
    if (invalidIdx >= 0) {
      setParseError(
        `Item #${invalidIdx + 1} needs a title and an amount greater than ₹0 before saving.`
      );
      return;
    }

    let totalSaved = 0;
    for (const draft of parsedDrafts) {
      const isoTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
        ? `${draft.date}T12:00:00.000Z`
        : new Date().toISOString();

      totalSaved += draft.amount;
      addTransaction({
        name: draft.name.trim(),
        amount: draft.amount,
        category: draft.category,
        timestamp: isoTimestamp,
        source: 'manual',
      });
    }

    const savedCount = parsedDrafts.length;
    setQuickSavedMsg(
      savedCount === 1
        ? `Saved "${parsedDrafts[0].name.trim()}" (₹${formatCurrencyExact(parsedDrafts[0].amount)}) to your ledger.`
        : `Saved ${savedCount} expenses (₹${formatCurrencyExact(totalSaved)} total) to your ledger.`
    );
    setParsedDrafts([]);
    setQuickText('');
    setParseError(null);
  };

  const isLiveCloud = aiConfigured === true;
  const activeProviderLabel =
    liveProvider === 'groq' ? 'Live AI · Groq' : liveProvider === 'gemini' ? 'Live AI · Gemini' : 'Live AI';
  const activeVibeOption =
    VIBE_OPTIONS.find((opt) => opt.id === pennyProfile.tonePreference) ?? VIBE_OPTIONS[0];

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Unified Sleek Control Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          {aiConfigured !== null && (
            <span
              data-testid="penny-ai-status"
              title={
                isLiveCloud
                  ? `Connected to ${activeProviderLabel}`
                  : cooldownSecs > 0
                    ? `Live AI servers busy — using Local Engine (auto-retrying in ${cooldownSecs}s)`
                    : 'Running Local Smart Engine (works offline and when AI Studio is closed)'
              }
              className="inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)] whitespace-nowrap shrink-0"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLiveCloud ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-warning)]'
                }`}
              />
              <span>{isLiveCloud ? activeProviderLabel : 'Local Engine'}</span>
            </span>
          )}

          {aiConfigured === false && (
            <button
              type="button"
              onClick={() => void refreshHealth()}
              disabled={isReconnecting}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-ink)] hover:underline whitespace-nowrap shrink-0 disabled:opacity-50"
              title={
                cooldownSecs > 0
                  ? `Retry Live AI now (auto-resumes in ${cooldownSecs}s)`
                  : 'Check if Live AI backend is reachable'
              }
            >
              <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Checking…' : compact ? 'Retry' : 'Reconnect'}</span>
            </button>
          )}

          <span className="text-[var(--text-muted)] shrink-0" aria-hidden="true">
            ·
          </span>

          <button
            type="button"
            onClick={() => setShowVibePicker((v) => !v)}
            aria-expanded={showVibePicker}
            data-testid="penny-vibe-toggle"
            title={liveStyleSummary}
            className={`inline-flex items-center gap-1 font-semibold text-[var(--accent-ink)] hover:opacity-80 transition-opacity ${
              compact ? 'shrink-0 whitespace-nowrap' : 'min-w-0 truncate'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className={compact ? 'whitespace-nowrap' : 'truncate'}>
              {compact ? activeVibeOption.label : liveStyleSummary}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {pennyMessages.length > 0 && mode === 'chat' && (
            <button
              type="button"
              onClick={() => {
                clearPennyMessages();
                setChatError(null);
              }}
              aria-label="Clear Penny chat"
              title="New chat"
              className="px-1.5 py-1 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] inline-flex items-center gap-1 whitespace-nowrap transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {!compact && <span>New Chat</span>}
            </button>
          )}

          <div
            role="group"
            aria-label="Penny mode"
            className="tactile-well inline-flex items-center p-0.5 rounded-xl bg-[var(--bg-well)] border border-[var(--border-subtle)]"
          >
            <button
              type="button"
              onClick={() => setMode('chat')}
              aria-pressed={mode === 'chat'}
              className={`${
                compact ? 'px-2' : 'px-2.5'
              } py-1 rounded-[9px] text-xs font-semibold whitespace-nowrap border transition-all ${
                mode === 'chat'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] shadow-xs'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Ask Penny
            </button>
            <button
              type="button"
              onClick={() => setMode('quick_log')}
              aria-pressed={mode === 'quick_log'}
              className={`${
                compact ? 'px-2' : 'px-2.5'
              } py-1 rounded-[9px] text-xs font-semibold whitespace-nowrap border transition-all ${
                mode === 'quick_log'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] shadow-xs'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Quick Log
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Tone Override Drawer */}
      {showVibePicker && (
        <div className="surface-subtle p-2.5 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <span className="font-medium">
              Adapts automatically ({pennyProfile.messageCount}{' '}
              {pennyProfile.messageCount === 1 ? 'chat' : 'chats'}). Override anytime:
            </span>
            <button
              type="button"
              onClick={() => setShowVibePicker(false)}
              aria-label="Close tone selector"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {VIBE_OPTIONS.map((opt) => {
              const active = pennyProfile.tonePreference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPennyTonePreference(opt.id)}
                  aria-pressed={active}
                  title={opt.hint}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                    active
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <p className="text-xs font-semibold leading-tight">{opt.label}</p>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      active ? 'text-white/80' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {opt.hint}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {actionBanner && (
        <div
          role="status"
          className="rounded-xl px-3 py-2 bg-[var(--accent-success-soft)] border border-[var(--accent-success-border)] text-[var(--accent-success-ink)] text-xs font-semibold flex items-center justify-between gap-2 shrink-0"
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
          {/* Conversation Viewport */}
          <div
            className={`flex-1 overflow-y-auto scrollbar-thin pr-1 ${
              compact ? 'min-h-[220px]' : 'min-h-[320px]'
            }`}
          >
            {pennyMessages.length === 0 ? (
              <div className="h-full flex flex-col justify-between gap-4 py-2">
                {/* Editorial Welcome + Live Money Pulse */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3">
                    <PennyEmblem size={compact ? 'md' : 'lg'} />
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold font-display text-[var(--text-primary)] tracking-tight leading-snug">
                        Ask Penny anything about your money
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Grounded in your live CartAudit ledger, cart, and split balances.
                      </p>
                    </div>
                  </div>

                  {/* Live Grounded Telemetry Strip (shown in floating drawer; full dashboard already displays Safe-to-Spend above) */}
                  {compact && (
                    <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 py-2.5">
                      <div className="px-3 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                          Remaining
                        </p>
                        <p className="text-[13px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5 truncate">
                          {pennyContext.budgetOverview.rawRemainingBudget < 0 ? '-' : ''}₹
                          {formatCurrencyExact(
                            Math.abs(pennyContext.budgetOverview.rawRemainingBudget)
                          )}
                        </p>
                      </div>
                      <div className="px-3 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                          Safe / Day
                        </p>
                        <p className="text-[13px] font-bold font-mono tabular-nums text-[var(--accent-success-ink)] mt-0.5 truncate">
                          ₹{formatCurrencyExact(pennyContext.futureCommitments.safeDailySpend)}
                        </p>
                      </div>
                      <div className="px-3 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                          Commitments
                        </p>
                        <p className="text-[13px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5 truncate">
                          ₹{formatCurrencyExact(pennyContext.futureCommitments.committedUpcoming30d)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive 2x2 Prompt Cards */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    Quick prompts
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {starterPrompts.slice(0, 4).map((item) => (
                      <button
                        key={item.prompt}
                        type="button"
                        disabled={isAsking}
                        onClick={() => void handleAskPenny(item.prompt)}
                        className="group rounded-xl p-2.5 border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-hover)] transition-all text-left flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-ink)] truncate transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-snug">
                            {item.prompt}
                          </p>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-ink)] shrink-0 mt-0.5 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-1">
                {pennyMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-relaxed bg-[var(--accent-primary)] text-white shadow-xs">
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                    ) : (
                      <div className="w-full flex items-start gap-2.5">
                        <div className="mt-0.5">
                          <PennyEmblem size="xs" variant="subtle" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div className="rounded-2xl rounded-tl-md bg-[var(--bg-subtle)]/80 border border-[var(--border-subtle)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--text-primary)]">
                            <p className="whitespace-pre-line">{msg.text}</p>

                            {msg.highlights && msg.highlights.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
                                {msg.highlights.map((h, idx) => (
                                  <div
                                    key={`${msg.id}-h-${idx}`}
                                    className="px-2 first:pl-0 last:pr-0 min-w-0"
                                  >
                                    <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                                      {h.label}
                                    </p>
                                    <p className="text-xs font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5 truncate">
                                      {h.value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Structured 1-Click Confirmation Action Cards */}
                            {msg.proposedActions && msg.proposedActions.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {msg.proposedActions.map((act) => {
                                  const draft = getEffectiveProposal(act);
                                  const isPending = act.status === 'pending';
                                  return (
                                    <div
                                      key={act.id}
                                      data-testid={`penny-proposal-${act.type}`}
                                      className="rounded-xl bg-[var(--bg-surface)] border border-[var(--accent-border)] p-3 space-y-2.5 shadow-xs"
                                    >
                                      <div className="flex items-start gap-2 min-w-0">
                                        <span className="mt-0.5">
                                          {getProposalBadgeIcon(act.type)}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                                            {act.title}
                                          </p>
                                          <p className="text-xs text-[var(--text-secondary)] leading-snug mt-0.5">
                                            {act.summary}
                                          </p>
                                        </div>
                                      </div>

                                      {isPending && draft.type === 'log_expense' && draft.expense && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
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
                                            className="input-field px-2.5 py-1.5 text-xs"
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
                                            className="input-field px-2.5 py-1.5 text-xs font-mono tabular-nums"
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
                                            className="input-field px-2.5 py-1.5 text-xs"
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
                                            className="input-field px-2.5 py-1.5 text-xs"
                                          />
                                        </div>
                                      )}

                                      {isPending &&
                                        draft.type === 'log_expenses' &&
                                        Array.isArray(draft.expenses) &&
                                        draft.expenses.length > 0 && (
                                          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                                            {draft.expenses.map((row, rowIdx) => (
                                              <div
                                                key={`${act.id}-row-${rowIdx}`}
                                                className="rounded-lg bg-[var(--bg-subtle)]/70 p-2 space-y-1.5 border border-[var(--border-subtle)]"
                                              >
                                                <div className="flex items-center justify-between gap-2">
                                                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                                    Item {rowIdx + 1}
                                                  </span>
                                                  {draft.expenses!.length > 1 && (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        updateProposalDraft(act, (c) => ({
                                                          ...c,
                                                          expenses: (c.expenses ?? []).filter(
                                                            (_, i) => i !== rowIdx
                                                          ),
                                                        }))
                                                      }
                                                      aria-label={`Remove item ${rowIdx + 1}`}
                                                      className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-danger-ink)]"
                                                    >
                                                      <X className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                  <input
                                                    type="text"
                                                    aria-label={`Expense ${rowIdx + 1} title`}
                                                    value={row.name}
                                                    onChange={(e) =>
                                                      updateProposalDraft(act, (c) => ({
                                                        ...c,
                                                        expenses: (c.expenses ?? []).map((it, i) =>
                                                          i === rowIdx
                                                            ? { ...it, name: e.target.value }
                                                            : it
                                                        ),
                                                      }))
                                                    }
                                                    className="input-field px-2 py-1 text-xs"
                                                  />
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    aria-label={`Expense ${rowIdx + 1} amount`}
                                                    value={row.amount}
                                                    onChange={(e) =>
                                                      updateProposalDraft(act, (c) => ({
                                                        ...c,
                                                        expenses: (c.expenses ?? []).map((it, i) =>
                                                          i === rowIdx
                                                            ? {
                                                                ...it,
                                                                amount: Number(e.target.value) || 0,
                                                              }
                                                            : it
                                                        ),
                                                      }))
                                                    }
                                                    className="input-field px-2 py-1 text-xs font-mono tabular-nums"
                                                  />
                                                  <select
                                                    aria-label={`Expense ${rowIdx + 1} category`}
                                                    value={row.category}
                                                    onChange={(e) =>
                                                      updateProposalDraft(act, (c) => ({
                                                        ...c,
                                                        expenses: (c.expenses ?? []).map((it, i) =>
                                                          i === rowIdx
                                                            ? { ...it, category: e.target.value }
                                                            : it
                                                        ),
                                                      }))
                                                    }
                                                    className="input-field px-2 py-1 text-xs"
                                                  >
                                                    {categories.map((c) => (
                                                      <option key={c} value={c}>
                                                        {c}
                                                      </option>
                                                    ))}
                                                  </select>
                                                  <input
                                                    type="date"
                                                    aria-label={`Expense ${rowIdx + 1} date`}
                                                    value={row.date || pennyContext.asOfDate}
                                                    onChange={(e) =>
                                                      updateProposalDraft(act, (c) => ({
                                                        ...c,
                                                        expenses: (c.expenses ?? []).map((it, i) =>
                                                          i === rowIdx
                                                            ? { ...it, date: e.target.value }
                                                            : it
                                                        ),
                                                      }))
                                                    }
                                                    className="input-field px-2 py-1 text-xs"
                                                  />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                      {isPending && draft.type === 'set_budget' && (
                                        <div className="pt-2 border-t border-[var(--border-subtle)]">
                                          <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
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
                                              className="input-field w-28 px-2.5 py-1 text-xs font-mono tabular-nums"
                                            />
                                          </label>
                                        </div>
                                      )}

                                      {isPending &&
                                        draft.type === 'set_category_limit' &&
                                        draft.categoryLimit && (
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
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
                                              className="input-field px-2.5 py-1.5 text-xs"
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
                                              className="input-field px-2.5 py-1.5 text-xs font-mono tabular-nums"
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
                                              className="input-field px-2.5 py-1.5 text-xs"
                                            >
                                              <option value="daily">Daily</option>
                                              <option value="weekly">Weekly</option>
                                              <option value="monthly">Monthly</option>
                                            </select>
                                          </div>
                                        )}

                                      {isPending && draft.type === 'add_split' && draft.split && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
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
                                            className="input-field px-2.5 py-1.5 text-xs"
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
                                            className="input-field px-2.5 py-1.5 text-xs font-mono tabular-nums"
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
                                            className="input-field px-2.5 py-1.5 text-xs"
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
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-success-ink)]">
                                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                          <span>{act.appliedMessage || 'Applied'}</span>
                                        </div>
                                      ) : act.status === 'dismissed' ? (
                                        <p className="text-xs text-[var(--text-muted)] font-medium">
                                          Dismissed
                                        </p>
                                      ) : (
                                        <div className="flex items-center gap-2 pt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleConfirmProposal(msg.id, act)}
                                            className="btn-primary px-3 py-1.5 text-xs whitespace-nowrap"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>
                                              {act.type === 'navigate'
                                                ? act.title
                                                : 'Confirm & Apply'}
                                            </span>
                                            {act.type === 'navigate' && (
                                              <ArrowRight className="w-3 h-3" />
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDismissProposal(msg.id, act.id)}
                                            className="btn-secondary px-2.5 py-1.5 text-xs whitespace-nowrap"
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

                          {(msg.isLocalFallback || msg.id.startsWith('a-local-')) && (
                            <div className="flex items-center gap-2 pl-0.5 text-xs text-[var(--text-muted)]">
                              <span>Answered via Local Engine</span>
                              <span aria-hidden="true">·</span>
                              <button
                                type="button"
                                disabled={isAsking || retryingMessageId !== null}
                                onClick={() => void handleRetryMessageWithLiveAi(msg.id)}
                                className="inline-flex items-center gap-1 font-semibold text-[var(--accent-ink)] hover:underline disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={`w-3 h-3 ${
                                    retryingMessageId === msg.id ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>
                                  {retryingMessageId === msg.id
                                    ? 'Retrying Live AI…'
                                    : 'Retry with Live AI'}
                                </span>
                              </button>
                            </div>
                          )}

                          {msg.role === 'assistant' &&
                            msg.followUpQuestions &&
                            msg.followUpQuestions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-0.5">
                                {msg.followUpQuestions.map((fq) => (
                                  <button
                                    key={fq}
                                    type="button"
                                    disabled={isAsking}
                                    onClick={() => void handleAskPenny(fq)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--accent-ink)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-primary-soft)] transition-colors text-left"
                                  >
                                    {fq}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isAsking && (
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      <PennyEmblem size="xs" variant="subtle" thinking />
                    </div>
                    <div className="rounded-2xl rounded-tl-md px-3.5 py-2.5 bg-[var(--bg-subtle)]/80 border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                      Penny is reviewing your ledger…
                    </div>
                  </div>
                )}

                {chatError && (
                  <div
                    role="alert"
                    className="rounded-xl px-3.5 py-2.5 bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)] text-xs flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{chatError}</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Voice Status / Error */}
          {(chatVoice.isListening || chatVoice.voiceError) && (
            <div
              role={chatVoice.voiceError ? 'alert' : 'status'}
              className={`rounded-xl px-3 py-1.5 text-xs flex items-center justify-between gap-2 shrink-0 ${
                chatVoice.voiceError
                  ? 'bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)]'
                  : 'bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)]'
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

          {/* Tactile Docked Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatVoice.isListening) chatVoice.stopListening();
              void handleAskPenny();
            }}
            className="shrink-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-well)]/80 focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)] p-1.5 pl-3 flex items-end gap-2 transition-all"
          >
            <label htmlFor={inputId} className="sr-only">
              Message Penny
            </label>
            <textarea
              ref={textareaRef}
              id={inputId}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (chatError) setChatError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (chatVoice.isListening) chatVoice.stopListening();
                  void handleAskPenny();
                }
              }}
              placeholder={
                chatVoice.isListening
                  ? 'Listening… speak now'
                  : hasCartItems
                    ? `Ask about your ₹${formatCurrencyExact(pennyContext.currentCart.totalAmount)} cart, splits, or anything…`
                    : 'Ask Penny anything… (Enter to send)'
              }
              disabled={isAsking}
              className="flex-1 min-w-0 resize-none bg-transparent py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none leading-snug max-h-[108px]"
            />

            <div className="flex items-center gap-1 shrink-0 pb-0.5">
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
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  chatVoice.isListening
                    ? 'bg-[var(--accent-danger-soft)] text-[var(--accent-danger-ink)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
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
                className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center shrink-0 transition-all shadow-xs"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>
          </form>
        </>
      ) : (
        /* Quick Natural-Language Expense Parser (Single & Multi-Item) */
        <div className="flex-1 flex flex-col justify-between gap-3 overflow-y-auto scrollbar-thin">
          <div className="space-y-3.5">
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Describe one or multiple expenses in plain English — separated by commas, &ldquo;and&rdquo;, or new lines — and Penny will extract every item, amount, category, and date.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_LOG_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuickText(example);
                      setParseError(null);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--accent-primary-soft)] text-[var(--text-secondary)] hover:text-[var(--accent-ink)] border border-[var(--border-subtle)] transition-colors text-left"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                if (quickVoice.isListening) quickVoice.stopListening();
                void handleParseQuickExpense(e);
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor={`${inputId}-quick-log`} className="sr-only">
                Describe one or more expenses to log
              </label>
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <textarea
                  id={`${inputId}-quick-log`}
                  rows={2}
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (quickVoice.isListening) quickVoice.stopListening();
                      void handleParseQuickExpense(e);
                    }
                  }}
                  placeholder={
                    quickVoice.isListening
                      ? 'Listening… say e.g. "Paid 180 coffee, 240 uber, 65 milk"'
                      : 'e.g. "Paid 180 coffee, 240 uber, 65 milk" (Enter to parse, Shift+Enter for new line)'
                  }
                  disabled={isParsingExpense}
                  className="input-field flex-1 min-w-0 px-3 py-2 text-[13px] resize-y min-h-[60px] max-h-[140px]"
                />
                <button
                  type="button"
                  onClick={quickVoice.toggleListening}
                  disabled={isParsingExpense}
                  aria-label={quickVoice.isListening ? 'Stop voice note' : 'Dictate expense note'}
                  aria-pressed={quickVoice.isListening}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                    quickVoice.isListening
                      ? 'bg-[var(--accent-danger-soft)] border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)]'
                      : 'bg-[var(--bg-subtle)] hover:bg-[var(--accent-primary-soft)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent-ink)]'
                  }`}
                >
                  {quickVoice.isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isParsingExpense || !quickText.trim()}
                  className="btn-primary px-4 py-2 text-xs whitespace-nowrap shrink-0"
                >
                  <span>{isParsingExpense ? 'Parsing…' : 'Parse Expenses'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {(quickVoice.isListening || quickVoice.voiceError) && (
              <div
                role={quickVoice.voiceError ? 'alert' : 'status'}
                className={`rounded-xl px-3 py-1.5 text-xs flex items-center justify-between gap-2 ${
                  quickVoice.voiceError
                    ? 'bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)]'
                    : 'bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)]'
                }`}
              >
                <span>
                  {quickVoice.voiceError
                    ? quickVoice.voiceError
                    : quickVoice.interimTranscript
                      ? `Listening: "${quickVoice.interimTranscript}"`
                      : 'Listening… dictate your expenses'}
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
                className="rounded-xl px-3 py-2 bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)] text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {quickSavedMsg && (
              <div
                role="status"
                className="rounded-xl px-3 py-2 bg-[var(--accent-success-soft)] border border-[var(--accent-success-border)] text-[var(--accent-success-ink)] text-xs flex items-center justify-between gap-2"
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

            {parsedDrafts.length > 0 && (
              <div
                data-testid="quick-log-review-panel"
                className="surface-subtle p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <p className="font-bold text-[var(--text-primary)]">
                      {parsedDrafts.length === 1
                        ? 'Review & Confirm Expense'
                        : `Review & Confirm ${parsedDrafts.length} Expenses · ₹${formatCurrencyExact(
                            parsedDrafts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
                          )}`}
                    </p>
                    {parsedDrafts.some((d) => d.isOfflineFallback) && (
                      <>
                        <span className="text-[var(--text-muted)]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-medium text-[var(--accent-warning-ink)]">
                          Local instant parse
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEmptyQuickRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-ink)] hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add row</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {parsedDrafts.map((draft, idx) => (
                    <div
                      key={`quick-draft-${idx}`}
                      data-testid={`quick-log-item-${idx}`}
                      className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          {parsedDrafts.length > 1 ? `Item ${idx + 1}` : 'Expense Details'}
                        </span>
                        <div className="flex items-center gap-2">
                          {draft.isSplitHint && draft.splitPersonHint && onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate('expenses')}
                              className="text-xs font-semibold text-[var(--accent-ink)] hover:underline"
                            >
                              Split with {draft.splitPersonHint}
                            </button>
                          )}
                          {parsedDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeParsedDraftAt(idx)}
                              aria-label={`Remove expense item ${idx + 1}`}
                              className="text-[var(--text-muted)] hover:text-[var(--accent-danger-ink)] p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="block space-y-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            Title
                          </span>
                          <input
                            type="text"
                            aria-label={`Item ${idx + 1} title`}
                            value={draft.name}
                            onChange={(e) =>
                              updateParsedDraftAt(idx, { name: e.target.value })
                            }
                            className="input-field w-full px-2.5 py-1.5 text-xs"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            Amount (₹)
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            aria-label={`Item ${idx + 1} amount`}
                            value={draft.amount || ''}
                            onChange={(e) =>
                              updateParsedDraftAt(idx, {
                                amount: Number(e.target.value) || 0,
                              })
                            }
                            className="input-field w-full px-2.5 py-1.5 text-xs font-mono tabular-nums"
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            Category
                          </span>
                          <select
                            aria-label={`Item ${idx + 1} category`}
                            value={draft.category}
                            onChange={(e) =>
                              updateParsedDraftAt(idx, { category: e.target.value })
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
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            Date
                          </span>
                          <input
                            type="date"
                            aria-label={`Item ${idx + 1} date`}
                            value={draft.date}
                            onChange={(e) =>
                              updateParsedDraftAt(idx, { date: e.target.value })
                            }
                            className="input-field w-full px-2.5 py-1.5 text-xs"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedDrafts([]);
                      setParseError(null);
                    }}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {parsedDrafts.length > 1 ? 'Discard All' : 'Discard'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveParsedExpenses}
                    className="btn-primary px-3.5 py-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {parsedDrafts.length === 1
                        ? 'Save to Ledger'
                        : `Save All ${parsedDrafts.length} to Ledger`}
                    </span>
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
