"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Flame,
  LogOut,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  UserCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "./actions/auth";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

type Frequency = "daily" | "weekly" | "monthly";
type ThemeKey = "pink" | "lavender" | "minimal" | "dark";
type JournalCategory = "self-love" | "anxiety" | "career" | "relationship" | "healing";
type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";
type TabKey = "daily" | "weekly" | "monthly" | "graphs" | "journal";

type Habit = {
  id: string;
  name: string;
  emoji: string;
  freq: Frequency;
  goal: number;
  checks: Record<string, boolean>;
  color: string;
  barColor: string;
};

type JournalEntry = {
  id: string;
  entryDate: string;
  moodScore: number;
  energyLevel: number;
  emotions: string[];
  tags: string[];
  promptCategory: JournalCategory;
  promptText: string;
  highlight: string;
  content: string;
  cycleDay: number | null;
  cyclePhase: CyclePhase | null;
};

type JournalFormState = {
  entryDate: string;
  moodScore: number;
  energyLevel: number;
  emotions: string[];
  tags: string[];
  promptCategory: JournalCategory;
  promptText: string;
  highlight: string;
  content: string;
};

type CycleSettings = {
  lastPeriodStart: string;
  cycleLength: number;
  periodLength: number;
};

type DbHabit = {
  id: string;
  name: string;
  emoji: string;
  freq: Frequency;
  goal: number;
  color: string;
  bar_color: string;
};

type DbHabitCheck = {
  habit_id: string;
  check_date: string;
  is_done: boolean;
};

type DbJournalEntry = {
  id: string;
  entry_date: string;
  mood_score: number;
  energy_level: number;
  emotions: string[];
  tags: string[];
  prompt_category: JournalCategory;
  prompt_text: string;
  highlight: string | null;
  content: string | null;
  cycle_day: number | null;
  cycle_phase: CyclePhase | null;
};

type DbCycleSettings = {
  last_period_start: string | null;
  cycle_length: number;
  period_length: number;
};

type PhaseMeta = {
  phase: CyclePhase;
  cycleDay: number;
  daysUntilNextPeriod: number;
};

const STORAGE_KEY = "habitTrackerData_v2";
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MOTIVATIONS = [
  { e: "🌸", t: "Setiap hari adalah kesempatan baru untuk menjadi lebih baik!" },
  { e: "💪", t: "Konsistensi adalah kunci kesuksesan. Kamu pasti bisa!" },
  { e: "✨", t: "Small steps every day lead to big results. Keep going!" },
  { e: "🦋", t: "Habit hari ini membentuk masa depanmu yang luar biasa!" },
  { e: "🎯", t: "Stay focused, stay consistent, stay amazing!" },
  { e: "🌈", t: "Progress is progress, no matter how small. Be proud!" },
  { e: "💖", t: "Love yourself enough to build habits that serve you!" },
];
const COLORS = [
  "linear-gradient(135deg,#ff80b5,#c77dff)",
  "linear-gradient(135deg,#ffb347,#ff80b5)",
  "linear-gradient(135deg,#a8edea,#c77dff)",
  "linear-gradient(135deg,#ff8a80,#ffb347)",
  "linear-gradient(135deg,#b8e3ff,#a8edea)",
  "linear-gradient(135deg,#d4b8ff,#ff80b5)",
  "linear-gradient(135deg,#fff176,#ffb347)",
];
const BAR_COLORS = ["#ff80b5", "#c77dff", "#ffb347", "#a8edea", "#ff8a80", "#b8e3ff", "#b9fbc0"];
const THEMES: { key: ThemeKey; label: string }[] = [
  { key: "pink", label: "Pink" },
  { key: "lavender", label: "Lavender" },
  { key: "minimal", label: "Minimal" },
  { key: "dark", label: "Dark" },
];
const EMOJI_OPTIONS = [
  ["🏋️", "Olahraga"],
  ["📚", "Baca Buku"],
  ["📖", "Belajar"],
  ["📱", "Update Konten"],
  ["💧", "Minum Air"],
  ["🧘", "Meditasi"],
  ["✍️", "Jurnal"],
  ["🎵", "Musik"],
  ["🍎", "Makan Sehat"],
  ["😴", "Tidur Cukup"],
  ["🚶", "Jalan Kaki"],
  ["💊", "Minum Vitamin"],
  ["🌿", "Skincare"],
  ["💻", "Coding"],
  ["🎯", "Lainnya"],
];
const JOURNAL_CATEGORIES: { key: JournalCategory; label: string }[] = [
  { key: "self-love", label: "Self-love" },
  { key: "anxiety", label: "Anxiety" },
  { key: "career", label: "Career" },
  { key: "relationship", label: "Relationship" },
  { key: "healing", label: "Healing" },
];
const EMOTION_OPTIONS = [
  "anxious",
  "overwhelmed",
  "calm",
  "confident",
  "hopeful",
  "drained",
  "grateful",
  "sensitive",
];
const TAG_OPTIONS = [
  "kerja",
  "relationship",
  "self-care",
  "family",
  "health",
  "rest",
  "social",
  "focus",
];
const PROMPTS: Record<JournalCategory, string[]> = {
  "self-love": [
    "Apa yang membuatmu merasa cukup hari ini?",
    "Bagian dari dirimu yang paling butuh kelembutan hari ini apa?",
    "Kalau kamu bicara ke diri sendiri dengan lebih lembut, apa yang ingin kamu katakan?",
  ],
  anxiety: [
    "Apa yang paling membuat pikiranmu ramai hari ini?",
    "Hal kecil apa yang bisa membantumu merasa lebih aman sekarang?",
    "Kalau kecemasanmu bisa bicara, ia sedang berusaha melindungimu dari apa?",
  ],
  career: [
    "Hal apa dari pekerjaanmu yang paling menguras energi akhir-akhir ini?",
    "Apa satu kemenangan kecilmu hari ini?",
    "Kalau besok ingin terasa lebih ringan, satu prioritasmu apa?",
  ],
  relationship: [
    "Interaksi mana hari ini yang paling tinggal di hati?",
    "Apa yang kamu butuhkan dari orang lain tapi belum sempat kamu ungkap?",
    "Bagaimana kamu ingin hadir lebih jujur dalam relasimu?",
  ],
  healing: [
    "Luka lama apa yang terasa disentuh hari ini?",
    "Apa bukti kecil bahwa kamu sedang bertumbuh, walau pelan?",
    "Hal apa yang sedang kamu lepaskan, dan apa yang ingin kamu jaga?",
  ],
};
const AFFIRMATIONS: Record<CyclePhase, string[]> = {
  menstrual: [
    "You are allowed to rest without earning it.",
    "Your softness is not a weakness.",
  ],
  follicular: [
    "Fresh energy belongs to you too.",
    "You are allowed to take up space with your ideas.",
  ],
  ovulation: [
    "Your presence carries warmth and clarity.",
    "Confidence can be gentle and still powerful.",
  ],
  luteal: [
    "Slowing down is wisdom, not failure.",
    "You are doing better than you think.",
  ],
};
const PHASE_HINTS: Record<CyclePhase, string> = {
  menstrual: "Saatnya rest and reflect. Prioritaskan tubuhmu, kurangi tekanan, dan pilih ritme yang lebih lembut.",
  follicular: "Energi biasanya mulai naik. Ini momen bagus untuk mencoba hal baru dan membangun momentum.",
  ovulation: "Fase yang cenderung lebih ekspansif. Waktu yang enak untuk tampil, ngobrol, dan bergerak lebih percaya diri.",
  luteal: "Tubuh bisa terasa lebih sensitif. Take it slow, rapikan prioritas, dan beri ruang untuk emosi.",
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDbDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function createHabit(name: string, emoji: string, freq: Frequency, goal: number, index: number): Habit {
  return {
    id: `local-${Date.now()}-${Math.random()}`,
    name,
    emoji,
    freq,
    goal: Number.isFinite(goal) ? Math.max(1, goal) : 30,
    checks: {},
    color: COLORS[index % COLORS.length],
    barColor: BAR_COLORS[index % BAR_COLORS.length],
  };
}

function mapDbHabit(row: DbHabit, checks: Record<string, boolean> = {}): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    freq: row.freq,
    goal: row.goal,
    checks,
    color: row.color,
    barColor: row.bar_color,
  };
}

function mapDbJournalEntry(row: DbJournalEntry): JournalEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    moodScore: row.mood_score,
    energyLevel: row.energy_level,
    emotions: row.emotions ?? [],
    tags: row.tags ?? [],
    promptCategory: row.prompt_category,
    promptText: row.prompt_text,
    highlight: row.highlight ?? "",
    content: row.content ?? "",
    cycleDay: row.cycle_day,
    cyclePhase: row.cycle_phase,
  };
}

function uiKeyToDbDate(key: string) {
  const [year, zeroBasedMonth, day] = key.split("-").map(Number);
  const month = String(zeroBasedMonth + 1).padStart(2, "0");
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

function dbDateToUiKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}-${month - 1}-${day}`;
}

function seedHabits() {
  return [
    createHabit("Olahraga 30 menit", "🏋️", "daily", 25, 0),
    createHabit("Baca Buku", "📚", "daily", 20, 1),
    createHabit("Update Konten", "📱", "weekly", 4, 2),
  ];
}

function readLocalHabits() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as Habit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getMonthChecks(habit: Habit, month: number, year: number) {
  let count = 0;
  const totalDays = daysInMonth(month, year);
  for (let day = 1; day <= totalDays; day += 1) {
    if (habit.checks[`${year}-${month}-${day}`]) count += 1;
  }
  return count;
}

function getCurrentStreak(habit: Habit, today: Date) {
  let streak = 0;
  const cursor = new Date(today);
  while (habit.checks[dateKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getBestStreak(habit: Habit) {
  const keys = Object.keys(habit.checks)
    .filter((key) => habit.checks[key])
    .map((key) => {
      const [year, month, day] = key.split("-").map(Number);
      return new Date(year, month, day).getTime();
    })
    .sort((a, b) => a - b);

  let best = 0;
  let current = 0;
  let previous: number | null = null;

  keys.forEach((time) => {
    if (previous !== null && (time - previous) / 86400000 === 1) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = time;
  });

  return best;
}

function getPromptForDay(category: JournalCategory, dateValue: string) {
  const prompts = PROMPTS[category];
  const seed = dateValue
    .split("-")
    .map(Number)
    .reduce((sum, part) => sum + part, 0);
  return prompts[seed % prompts.length];
}

function toggleSelection(values: string[], next: string) {
  return values.includes(next) ? values.filter((item) => item !== next) : [...values, next];
}

function buildDefaultJournalForm(dateValue: string, category: JournalCategory = "self-love"): JournalFormState {
  return {
    entryDate: dateValue,
    moodScore: 6,
    energyLevel: 6,
    emotions: [],
    tags: [],
    promptCategory: category,
    promptText: getPromptForDay(category, dateValue),
    highlight: "",
    content: "",
  };
}

function computeCycleMeta(settings: CycleSettings, todayDate: string): PhaseMeta | null {
  if (!settings.lastPeriodStart) return null;

  const start = new Date(settings.lastPeriodStart);
  const today = new Date(todayDate);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (Number.isNaN(diffDays) || diffDays < 0) return null;

  const cycleDay = (diffDays % settings.cycleLength) + 1;
  const ovulationStart = Math.max(settings.periodLength + 1, settings.cycleLength - 16);
  const ovulationEnd = Math.max(ovulationStart, settings.cycleLength - 12);
  let phase: CyclePhase;

  if (cycleDay <= settings.periodLength) {
    phase = "menstrual";
  } else if (cycleDay >= ovulationStart && cycleDay <= ovulationEnd) {
    phase = "ovulation";
  } else if (cycleDay < ovulationStart) {
    phase = "follicular";
  } else {
    phase = "luteal";
  }

  return {
    phase,
    cycleDay,
    daysUntilNextPeriod: settings.cycleLength - cycleDay,
  };
}

function getAffirmation(phase: CyclePhase | null, moodScore: number) {
  if (phase) {
    return AFFIRMATIONS[phase][moodScore % AFFIRMATIONS[phase].length];
  }
  return moodScore <= 5 ? "You are allowed to feel what you feel without rushing to fix it." : "You can honor this good moment without shrinking it.";
}

function getPhaseLabel(phase: CyclePhase | null) {
  switch (phase) {
    case "menstrual":
      return "Menstrual";
    case "follicular":
      return "Follicular";
    case "ovulation":
      return "Ovulation";
    case "luteal":
      return "Luteal";
    default:
      return "Belum diatur";
  }
}

function getPhaseInsight(phase: CyclePhase | null) {
  return phase ? PHASE_HINTS[phase] : "Tambahkan tanggal mulai menstruasi terakhir supaya jurnalmu terasa lebih context-aware.";
}

function getTopLabel(values: string[]) {
  if (values.length === 0) return "Belum ada pola";
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function getHabitCompletionCountForDate(habits: Habit[], entryDate: string) {
  const key = dbDateToUiKey(entryDate);
  return habits.filter((habit) => habit.checks[key]).length;
}

function getJournalInsight(entries: JournalEntry[], habits: Habit[], cycleMeta: PhaseMeta | null) {
  const recentEntries = entries.slice(0, 14);
  if (recentEntries.length === 0) {
    return "Belum ada entry. Mulai dari quick check-in hari ini supaya app bisa mengenali pola emosimu.";
  }

  const moodAverage = recentEntries.reduce((sum, entry) => sum + entry.moodScore, 0) / recentEntries.length;
  const topEmotion = getTopLabel(recentEntries.flatMap((entry) => entry.emotions));
  const phaseEntries = cycleMeta
    ? recentEntries.filter((entry) => entry.cyclePhase === cycleMeta.phase)
    : [];
  const phaseAverage = phaseEntries.length
    ? phaseEntries.reduce((sum, entry) => sum + entry.moodScore, 0) / phaseEntries.length
    : null;
  const habitLinkedEntries = recentEntries.filter((entry) => getHabitCompletionCountForDate(habits, entry.entryDate) > 0);
  const habitMoodAverage = habitLinkedEntries.length
    ? habitLinkedEntries.reduce((sum, entry) => sum + entry.moodScore, 0) / habitLinkedEntries.length
    : null;

  if (cycleMeta && phaseAverage !== null) {
    return `Di fase ${getPhaseLabel(cycleMeta.phase)}, rata-rata mood-mu ${phaseAverage.toFixed(1)}/10. Emosi yang paling sering muncul: ${topEmotion}.`;
  }

  if (habitMoodAverage !== null) {
    return `Saat kamu tetap menjalani habit, rata-rata mood harianmu ${habitMoodAverage.toFixed(1)}/10. Emosi yang paling sering muncul: ${topEmotion}.`;
  }

  return `Rata-rata mood 14 hari terakhirmu ${moodAverage.toFixed(1)}/10. Emosi yang paling sering muncul: ${topEmotion}.`;
}

export default function DashboardClient({
  avatarUrl,
  userId,
  userEmail,
  userName,
}: {
  avatarUrl: string | null;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => new Date(), []);
  const todayDate = useMemo(() => formatDbDate(today), [today]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("daily");
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [newHabit, setNewHabit] = useState({
    name: "",
    emoji: "🏋️",
    freq: "daily" as Frequency,
    goal: 30,
  });
  const [theme, setTheme] = useState<ThemeKey>("pink");
  const [cycleSettings, setCycleSettings] = useState<CycleSettings>({
    lastPeriodStart: "",
    cycleLength: 28,
    periodLength: 5,
  });
  const [journalForm, setJournalForm] = useState<JournalFormState>(() => buildDefaultJournalForm(todayDate));
  const [isReady, setIsReady] = useState(false);
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);
  const [isLoadingJournal, setIsLoadingJournal] = useState(true);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [isSavingCycle, setIsSavingCycle] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const todayEntry = useMemo(
    () => journalEntries.find((entry) => entry.entryDate === todayDate) ?? null,
    [journalEntries, todayDate],
  );
  const cycleMeta = useMemo(() => computeCycleMeta(cycleSettings, todayDate), [cycleSettings, todayDate]);
  const affirmation = useMemo(() => getAffirmation(cycleMeta?.phase ?? null, journalForm.moodScore), [cycleMeta, journalForm.moodScore]);
  const journalInsight = useMemo(() => getJournalInsight(journalEntries, habits, cycleMeta), [cycleMeta, habits, journalEntries]);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadHabits() {
      setIsLoadingHabits(true);
      setCloudError(null);

      const { data: habitRows, error: habitError } = await supabase
        .from("habits")
        .select("id,name,emoji,freq,goal,color,bar_color")
        .order("created_at", { ascending: true });

      if (habitError) {
        if (!ignore) {
          setCloudError(habitError.message);
          setIsLoadingHabits(false);
        }
        return;
      }

      let rows = (habitRows ?? []) as DbHabit[];

      if (rows.length === 0) {
        rows = await seedCloudHabits();
      }

      const habitIds = rows.map((habit) => habit.id);
      const checksByHabit: Record<string, Record<string, boolean>> = {};

      if (habitIds.length > 0) {
        const { data: checkRows, error: checkError } = await supabase
          .from("habit_checks")
          .select("habit_id,check_date,is_done")
          .in("habit_id", habitIds);

        if (checkError) {
          if (!ignore) {
            setCloudError(checkError.message);
            setIsLoadingHabits(false);
          }
          return;
        }

        ((checkRows ?? []) as DbHabitCheck[]).forEach((check) => {
          checksByHabit[check.habit_id] ??= {};
          checksByHabit[check.habit_id][dbDateToUiKey(check.check_date)] = check.is_done;
        });
      }

      if (!ignore) {
        setHabits(rows.map((row) => mapDbHabit(row, checksByHabit[row.id] ?? {})));
        setIsLoadingHabits(false);
      }
    }

    async function seedCloudHabits() {
      const localHabits = readLocalHabits();
      const sourceHabits = localHabits.length > 0 ? localHabits : seedHabits();
      const insertedRows: DbHabit[] = [];

      for (const [index, habit] of sourceHabits.entries()) {
        const { data, error } = await supabase
          .from("habits")
          .insert({
            user_id: userId,
            name: habit.name,
            emoji: habit.emoji,
            freq: habit.freq,
            goal: habit.goal,
            color: habit.color || COLORS[index % COLORS.length],
            bar_color: habit.barColor || BAR_COLORS[index % BAR_COLORS.length],
          })
          .select("id,name,emoji,freq,goal,color,bar_color")
          .single();

        if (error) {
          throw error;
        }

        const inserted = data as DbHabit;
        insertedRows.push(inserted);

        const checksToInsert = Object.entries(habit.checks ?? {})
          .filter(([, checked]) => checked)
          .map(([key]) => ({
            user_id: userId,
            habit_id: inserted.id,
            check_date: uiKeyToDbDate(key),
            is_done: true,
          }));

        if (checksToInsert.length > 0) {
          const { error: checkError } = await supabase.from("habit_checks").insert(checksToInsert);
          if (checkError) {
            throw checkError;
          }
        }
      }

      if (localHabits.length > 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      return insertedRows;
    }

    loadHabits().catch((error) => {
      if (!ignore) {
        setCloudError(error instanceof Error ? error.message : "Gagal memuat data Supabase.");
        setIsLoadingHabits(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [supabase, userId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      const { data, error } = await supabase
        .from("user_settings")
        .select("theme")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        setCloudError(error.message);
        return;
      }

      if (ignore) return;

      if (data?.theme === "pink" || data?.theme === "lavender" || data?.theme === "minimal" || data?.theme === "dark") {
        setTheme(data.theme);
        return;
      }

      const { error: insertError } = await supabase.from("user_settings").insert({
        user_id: userId,
        theme: "pink",
      });

      if (insertError) {
        setCloudError(insertError.message);
      }
    }

    loadSettings();

    return () => {
      ignore = true;
    };
  }, [supabase, userId]);

  useEffect(() => {
    let ignore = false;

    async function loadJournal() {
      setIsLoadingJournal(true);

      const [{ data: entryRows, error: entryError }, { data: cycleRow, error: cycleError }] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id,entry_date,mood_score,energy_level,emotions,tags,prompt_category,prompt_text,highlight,content,cycle_day,cycle_phase")
          .order("entry_date", { ascending: false }),
        supabase
          .from("cycle_settings")
          .select("last_period_start,cycle_length,period_length")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (entryError) {
        if (!ignore) {
          setCloudError(entryError.message);
          setIsLoadingJournal(false);
        }
        return;
      }

      if (cycleError) {
        if (!ignore) {
          setCloudError(cycleError.message);
          setIsLoadingJournal(false);
        }
        return;
      }

      if (ignore) return;

      const mappedEntries = ((entryRows ?? []) as DbJournalEntry[]).map(mapDbJournalEntry);
      setJournalEntries(mappedEntries);

      if (cycleRow) {
        const settings = cycleRow as DbCycleSettings;
        setCycleSettings({
          lastPeriodStart: settings.last_period_start ?? "",
          cycleLength: settings.cycle_length,
          periodLength: settings.period_length,
        });
      }

      setIsLoadingJournal(false);
    }

    loadJournal();

    return () => {
      ignore = true;
    };
  }, [supabase, userId]);

  useEffect(() => {
    if (!isReady || isLoadingJournal) return;

    if (todayEntry) {
      setJournalForm({
        entryDate: todayEntry.entryDate,
        moodScore: todayEntry.moodScore,
        energyLevel: todayEntry.energyLevel,
        emotions: todayEntry.emotions,
        tags: todayEntry.tags,
        promptCategory: todayEntry.promptCategory,
        promptText: todayEntry.promptText,
        highlight: todayEntry.highlight,
        content: todayEntry.content,
      });
      return;
    }

    setJournalForm((current) => {
      const fallback = buildDefaultJournalForm(todayDate, current.promptCategory);
      return { ...fallback, promptCategory: current.promptCategory, promptText: getPromptForDay(current.promptCategory, todayDate) };
    });
  }, [isLoadingJournal, isReady, todayDate, todayEntry]);

  async function changeTheme(nextTheme: ThemeKey) {
    const previous = theme;
    setTheme(nextTheme);

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        theme: nextTheme,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setTheme(previous);
      setCloudError(error.message);
    }
  }

  async function addHabit() {
    const name = newHabit.name.trim();
    if (!name) {
      window.alert("Isi nama habit dulu ya!");
      return;
    }

    const nextIndex = habits.length;
    const payload = {
      user_id: userId,
      name,
      emoji: newHabit.emoji,
      freq: newHabit.freq,
      goal: Math.max(1, Number(newHabit.goal) || 1),
      color: COLORS[nextIndex % COLORS.length],
      bar_color: BAR_COLORS[nextIndex % BAR_COLORS.length],
    };

    const { data, error } = await supabase
      .from("habits")
      .insert(payload)
      .select("id,name,emoji,freq,goal,color,bar_color")
      .single();

    if (error) {
      setCloudError(error.message);
      return;
    }

    setHabits((current) => [...current, mapDbHabit(data as DbHabit)]);
    setNewHabit((current) => ({ ...current, name: "" }));
  }

  async function updateHabit(id: string, update: Partial<Habit>) {
    const previous = habits;
    setHabits((current) => current.map((habit) => (habit.id === id ? { ...habit, ...update } : habit)));

    const { error } = await supabase
      .from("habits")
      .update({
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...(update.emoji !== undefined ? { emoji: update.emoji } : {}),
        ...(update.freq !== undefined ? { freq: update.freq } : {}),
        ...(update.goal !== undefined ? { goal: update.goal } : {}),
      })
      .eq("id", id);

    if (error) {
      setCloudError(error.message);
      setHabits(previous);
    }
  }

  async function deleteHabit(id: string) {
    if (!window.confirm("Hapus habit ini?")) return;

    const previous = habits;
    setHabits((current) => current.filter((habit) => habit.id !== id));

    const { error } = await supabase.from("habits").delete().eq("id", id);

    if (error) {
      setCloudError(error.message);
      setHabits(previous);
    }
  }

  async function toggleCheck(habitId: string, key: string) {
    const habit = habits.find((item) => item.id === habitId);
    const nextChecked = !habit?.checks[key];
    const previous = habits;

    setHabits((current) =>
      current.map((currentHabit) =>
        currentHabit.id === habitId
          ? { ...currentHabit, checks: { ...currentHabit.checks, [key]: !currentHabit.checks[key] } }
          : currentHabit,
      ),
    );

    if (nextChecked) {
      const { error } = await supabase.from("habit_checks").upsert(
        {
          user_id: userId,
          habit_id: habitId,
          check_date: uiKeyToDbDate(key),
          is_done: true,
        },
        { onConflict: "habit_id,check_date" },
      );

      if (error) {
        setCloudError(error.message);
        setHabits(previous);
      }
      return;
    }

    const { error } = await supabase
      .from("habit_checks")
      .delete()
      .eq("habit_id", habitId)
      .eq("check_date", uiKeyToDbDate(key));

    if (error) {
      setCloudError(error.message);
      setHabits(previous);
    }
  }

  function updateJournalCategory(nextCategory: JournalCategory) {
    setJournalForm((current) => ({
      ...current,
      promptCategory: nextCategory,
      promptText: getPromptForDay(nextCategory, current.entryDate),
    }));
  }

  async function saveCycleSettings() {
    setIsSavingCycle(true);

    const { error } = await supabase.from("cycle_settings").upsert(
      {
        user_id: userId,
        last_period_start: cycleSettings.lastPeriodStart || null,
        cycle_length: cycleSettings.cycleLength,
        period_length: cycleSettings.periodLength,
      },
      { onConflict: "user_id" },
    );

    setIsSavingCycle(false);

    if (error) {
      setCloudError(error.message);
    }
  }

  async function saveJournalEntry() {
    setIsSavingJournal(true);
    const meta = computeCycleMeta(cycleSettings, journalForm.entryDate);

    const payload = {
      user_id: userId,
      entry_date: journalForm.entryDate,
      mood_score: journalForm.moodScore,
      energy_level: journalForm.energyLevel,
      emotions: journalForm.emotions,
      tags: journalForm.tags,
      prompt_category: journalForm.promptCategory,
      prompt_text: journalForm.promptText,
      highlight: journalForm.highlight.trim() || null,
      content: journalForm.content.trim() || null,
      cycle_day: meta?.cycleDay ?? null,
      cycle_phase: meta?.phase ?? null,
    };

    const { data, error } = await supabase
      .from("journal_entries")
      .upsert(payload, { onConflict: "user_id,entry_date" })
      .select("id,entry_date,mood_score,energy_level,emotions,tags,prompt_category,prompt_text,highlight,content,cycle_day,cycle_phase")
      .single();

    setIsSavingJournal(false);

    if (error) {
      setCloudError(error.message);
      return;
    }

    const nextEntry = mapDbJournalEntry(data as DbJournalEntry);
    setJournalEntries((current) => {
      const withoutToday = current.filter((entry) => entry.entryDate !== nextEntry.entryDate);
      return [nextEntry, ...withoutToday].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    });
  }

  const motivation = MOTIVATIONS[today.getDay() % MOTIVATIONS.length];
  const todayKey = dateKey(today);
  const doneToday = habits.filter((habit) => habit.checks[todayKey]).length;
  const bestStreak = habits.length ? Math.max(...habits.map(getBestStreak)) : 0;
  const todayRate = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="app-header">
        <div className="user-bar">
          <div className="user-chip">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserCircle size={30} />}
            <span>
              <strong>{userName}</strong>
              <small>{userEmail}</small>
            </span>
          </div>
          <div className="theme-switcher" aria-label="Pilih tema">
            <Palette size={16} />
            {THEMES.map((item) => (
              <button
                className={theme === item.key ? "active" : ""}
                key={item.key}
                onClick={() => changeTheme(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <form action={signOut}>
            <button className="logout-button" type="submit" aria-label="Logout">
              <LogOut size={17} />
              Logout
            </button>
          </form>
        </div>
        <div className="header-title">My Habit Tracker</div>
        <div className="header-sub">Bangun kebiasaan terbaik versi kamu, dan kenali ritme dirimu lebih dalam.</div>
        <div className="header-date">
          {today.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </header>

      <div className="main-wrap">
        {cloudError ? (
          <div className="cloud-alert">
            <strong>Cloud database belum siap.</strong>
            <span>{cloudError}</span>
          </div>
        ) : null}

        {isLoadingHabits ? <div className="cloud-loading">Memuat data habit dari Supabase...</div> : null}
        {isLoadingJournal ? <div className="cloud-loading">Menyiapkan journal dan insight personalmu...</div> : null}

        <section className="motivate-bar">
          <span className="motivate-emoji">{motivation.e}</span>
          <span>{motivation.t}</span>
        </section>

        <section className="stats-grid" aria-label="Ringkasan habit">
          <StatCard value={habits.length.toString()} label="Total Habits" />
          <StatCard value={doneToday.toString()} label="Done Today" />
          <StatCard value={`${bestStreak} hari`} label="Best Streak" />
          <StatCard value={`${todayRate}%`} label="Today's Rate" />
        </section>

        <nav className="tabs" aria-label="Navigasi habit tracker">
          <TabButton active={activeTab === "daily"} onClick={() => setActiveTab("daily")} icon={<CalendarDays />}>
            Daily
          </TabButton>
          <TabButton active={activeTab === "weekly"} onClick={() => setActiveTab("weekly")} icon={<CalendarRange />}>
            Weekly
          </TabButton>
          <TabButton active={activeTab === "monthly"} onClick={() => setActiveTab("monthly")} icon={<CalendarRange />}>
            Monthly
          </TabButton>
          <TabButton active={activeTab === "graphs"} onClick={() => setActiveTab("graphs")} icon={<ChartNoAxesCombined />}>
            Graphs
          </TabButton>
          <TabButton active={activeTab === "journal"} onClick={() => setActiveTab("journal")} icon={<Sparkles />}>
            Journal
          </TabButton>
        </nav>

        {activeTab === "daily" && (
          <DailyPanel
            currentMonth={currentMonth}
            currentYear={currentYear}
            habits={habits}
            newHabit={newHabit}
            setCurrentMonth={setCurrentMonth}
            setCurrentYear={setCurrentYear}
            setNewHabit={setNewHabit}
            today={today}
            addHabit={addHabit}
            deleteHabit={deleteHabit}
            toggleCheck={toggleCheck}
            updateHabit={updateHabit}
          />
        )}
        {activeTab === "weekly" && <WeeklyPanel habits={habits} today={today} toggleCheck={toggleCheck} />}
        {activeTab === "monthly" && (
          <MonthlyPanel
            currentMonth={currentMonth}
            currentYear={currentYear}
            habits={habits}
            today={today}
            toggleCheck={toggleCheck}
          />
        )}
        {activeTab === "graphs" && (
          <GraphsPanel currentMonth={currentMonth} currentYear={currentYear} habits={habits} theme={theme} today={today} />
        )}
        {activeTab === "journal" && (
          <JournalPanel
            affirmation={affirmation}
            cycleMeta={cycleMeta}
            cycleSettings={cycleSettings}
            entries={journalEntries}
            habits={habits}
            isSavingCycle={isSavingCycle}
            isSavingJournal={isSavingJournal}
            journalForm={journalForm}
            journalInsight={journalInsight}
            saveCycleSettings={saveCycleSettings}
            saveJournalEntry={saveJournalEntry}
            setCycleSettings={setCycleSettings}
            setJournalForm={setJournalForm}
            todayDate={todayDate}
            updateJournalCategory={updateJournalCategory}
          />
        )}
      </div>
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <article className="stat-card">
      <div className="stat-val">{value}</div>
      <div className="stat-label">{label}</div>
    </article>
  );
}

function TabButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={`tab-btn ${active ? "active" : ""}`} onClick={onClick} type="button">
      {icon}
      <span>{children}</span>
    </button>
  );
}

function DailyPanel({
  addHabit,
  currentMonth,
  currentYear,
  deleteHabit,
  habits,
  newHabit,
  setCurrentMonth,
  setCurrentYear,
  setNewHabit,
  today,
  toggleCheck,
  updateHabit,
}: {
  addHabit: () => void;
  currentMonth: number;
  currentYear: number;
  deleteHabit: (id: string) => void;
  habits: Habit[];
  newHabit: { name: string; emoji: string; freq: Frequency; goal: number };
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  setNewHabit: React.Dispatch<React.SetStateAction<{ name: string; emoji: string; freq: Frequency; goal: number }>>;
  today: Date;
  toggleCheck: (habitId: string, key: string) => void;
  updateHabit: (id: string, update: Partial<Habit>) => void;
}) {
  return (
    <section>
      <div className="add-habit-panel">
        <h3>
          <Plus size={18} /> Tambah Habit Baru
        </h3>
        <div className="add-row">
          <input
            type="text"
            value={newHabit.name}
            onChange={(event) => setNewHabit((current) => ({ ...current, name: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === "Enter") addHabit();
            }}
            placeholder="Nama habit (misal: Olahraga 30 menit)"
          />
          <select
            value={newHabit.emoji}
            onChange={(event) => setNewHabit((current) => ({ ...current, emoji: event.target.value }))}
          >
            {EMOJI_OPTIONS.map(([emoji, label]) => (
              <option key={label} value={emoji}>
                {emoji} {label}
              </option>
            ))}
          </select>
          <select
            value={newHabit.freq}
            onChange={(event) => setNewHabit((current) => ({ ...current, freq: event.target.value as Frequency }))}
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
          <input
            type="number"
            min={1}
            max={31}
            value={newHabit.goal}
            onChange={(event) => setNewHabit((current) => ({ ...current, goal: Number(event.target.value) }))}
            aria-label="Goal per bulan"
          />
          <button className="btn-add" onClick={addHabit} type="button">
            <Plus size={18} /> Tambah
          </button>
        </div>
      </div>

      <div className="section-head">
        <div className="section-title">
          Habits Kamu <span className="pill-count">{habits.length}</span>
        </div>
        <MonthPicker
          currentMonth={currentMonth}
          currentYear={currentYear}
          setCurrentMonth={setCurrentMonth}
          setCurrentYear={setCurrentYear}
        />
      </div>

      <div className="habits-list">
        {habits.length === 0 ? (
          <EmptyState icon="🌸" text="Belum ada habit! Tambahkan habit pertamamu di atas yuk." />
        ) : (
          habits.map((habit) => (
            <HabitCard
              key={habit.id}
              currentMonth={currentMonth}
              currentYear={currentYear}
              deleteHabit={deleteHabit}
              habit={habit}
              today={today}
              toggleCheck={toggleCheck}
              updateHabit={updateHabit}
            />
          ))
        )}
      </div>
    </section>
  );
}

function MonthPicker({
  currentMonth,
  currentYear,
  setCurrentMonth,
  setCurrentYear,
}: {
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
}) {
  return (
    <div className="month-picker">
      <label htmlFor="month-select">Bulan:</label>
      <select id="month-select" value={currentMonth} onChange={(event) => setCurrentMonth(Number(event.target.value))}>
        {MONTHS.map((month, index) => (
          <option value={index} key={month}>
            {month}
          </option>
        ))}
      </select>
      <input
        aria-label="Tahun"
        type="number"
        value={currentYear}
        onChange={(event) => setCurrentYear(Number(event.target.value))}
      />
    </div>
  );
}

function HabitCard({
  currentMonth,
  currentYear,
  deleteHabit,
  habit,
  today,
  toggleCheck,
  updateHabit,
}: {
  currentMonth: number;
  currentYear: number;
  deleteHabit: (id: string) => void;
  habit: Habit;
  today: Date;
  toggleCheck: (habitId: string, key: string) => void;
  updateHabit: (id: string, update: Partial<Habit>) => void;
}) {
  const done = getMonthChecks(habit, currentMonth, currentYear);
  const pct = Math.min(100, Math.round((done / habit.goal) * 100));
  const isThisMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const totalDays = daysInMonth(currentMonth, currentYear);
  const frequencyLabel = habit.freq === "daily" ? "Harian" : habit.freq === "weekly" ? "Mingguan" : "Bulanan";

  return (
    <article className="habit-card">
      <div className="habit-header">
        <span className="habit-emoji">{habit.emoji}</span>
        <div className="habit-name-wrap">
          <div className="habit-name">{habit.name}</div>
          <span className={`habit-freq-badge freq-${habit.freq}`}>{frequencyLabel}</span>
        </div>
        <div className="habit-streak">
          <Flame size={16} fill="currentColor" /> {getCurrentStreak(habit, today)} hari
        </div>
        <button className="btn-del" onClick={() => deleteHabit(habit.id)} type="button" aria-label={`Hapus ${habit.name}`}>
          <Trash2 size={19} />
        </button>
      </div>

      <div className="habit-progress-wrap">
        <div className="progress-top">
          <span>
            Progress bulan ini: <b>{done}/{habit.goal}</b>
          </span>
          <span>
            <b>{pct}%</b>
          </span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: habit.color }} />
        </div>
      </div>

      <div className="habit-goal">
        <span>Goal per bulan:</span>
        <input
          className="goal-edit"
          type="number"
          min={1}
          max={31}
          value={habit.goal}
          onChange={(event) => updateHabit(habit.id, { goal: Math.max(1, Number(event.target.value) || 1) })}
          aria-label={`Goal ${habit.name}`}
        />
        <span>kali</span>
        <span className="goal-detail">Selesai: {done} kali</span>
        <span className="goal-detail">{pct >= 100 ? "Goal tercapai!" : `Sisa ${Math.max(0, habit.goal - done)} lagi`}</span>
      </div>

      <div className="habit-checks">
        <div className="checks-label">Centang hari yang sudah kamu lakukan:</div>
        <div className="checks-grid">
          {Array.from({ length: totalDays }, (_, index) => {
            const day = index + 1;
            const key = `${currentYear}-${currentMonth}-${day}`;
            const checked = habit.checks[key];
            const isToday = isThisMonth && day === today.getDate();
            return (
              <button className="day-check" key={key} onClick={() => toggleCheck(habit.id, key)} type="button">
                <span className="day-label">{day}</span>
                <span className={`check-box ${checked ? "checked" : ""} ${isToday ? "today-box" : ""}`}>
                  {checked ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function WeeklyPanel({
  habits,
  today,
  toggleCheck,
}: {
  habits: Habit[];
  today: Date;
  toggleCheck: (habitId: string, key: string) => void;
}) {
  const weekDays = useMemo(() => {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [today]);

  if (habits.length === 0) return <EmptyState icon="📅" text="Tambah habit dulu yuk!" />;

  return (
    <section>
      <div className="section-head">
        <div className="section-title">Minggu Ini</div>
      </div>
      <div className="weekly-table-wrap">
        <table className="weekly-table">
          <thead>
            <tr>
              <th>Habit</th>
              {weekDays.map((date) => {
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <th className={isToday ? "is-today" : ""} key={date.toDateString()}>
                    {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][weekDays.indexOf(date)]}
                    <span>{date.getDate()}</span>
                  </th>
                );
              })}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => {
              const weekTotal = weekDays.filter((date) => habit.checks[dateKey(date)]).length;
              return (
                <tr key={habit.id}>
                  <td>
                    {habit.emoji} {habit.name}
                  </td>
                  {weekDays.map((date) => {
                    const key = dateKey(date);
                    const checked = habit.checks[key];
                    const isToday = date.toDateString() === today.toDateString();
                    return (
                      <td key={key}>
                        <button
                          className={`week-habit-check ${checked ? "checked" : ""} ${isToday ? "today-box" : ""}`}
                          onClick={() => toggleCheck(habit.id, key)}
                          type="button"
                          aria-label={`${habit.name} tanggal ${date.getDate()}`}
                        >
                          {checked ? "✓" : ""}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <span className="pill-count">{weekTotal}/7</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MonthlyPanel({
  currentMonth,
  currentYear,
  habits,
  today,
  toggleCheck,
}: {
  currentMonth: number;
  currentYear: number;
  habits: Habit[];
  today: Date;
  toggleCheck: (habitId: string, key: string) => void;
}) {
  if (habits.length === 0) return <EmptyState icon="🗓️" text="Tambah habit dulu yuk!" />;

  const totalDays = daysInMonth(currentMonth, currentYear);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  return (
    <section>
      <div className="section-head">
        <div className="section-title">Heatmap Bulanan</div>
      </div>
      {habits.map((habit) => {
        const done = getMonthChecks(habit, currentMonth, currentYear);
        const pct = Math.min(100, Math.round((done / habit.goal) * 100));

        return (
          <article className="monthly-habit-section" key={habit.id}>
            <h4>
              {habit.emoji} {habit.name} <span className="pill-count">{done}/{habit.goal} ({pct}%)</span>
            </h4>
            <div className="heatmap-grid">
              {["S", "S", "R", "K", "J", "S", "M"].map((label, index) => (
                <div className="hm-label" key={`${label}-${index}`}>
                  {label}
                </div>
              ))}
              {Array.from({ length: offset }, (_, index) => (
                <div className="hm-cell empty-day" key={`empty-${index}`} />
              ))}
              {Array.from({ length: totalDays }, (_, index) => {
                const day = index + 1;
                const key = `${currentYear}-${currentMonth}-${day}`;
                const checked = habit.checks[key];
                const isToday = currentMonth === today.getMonth() && currentYear === today.getFullYear() && day === today.getDate();
                return (
                  <button
                    className={`hm-cell ${checked ? "filled" : ""} ${isToday ? "today-cell" : ""}`}
                    key={key}
                    onClick={() => toggleCheck(habit.id, key)}
                    type="button"
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function GraphsPanel({
  currentMonth,
  currentYear,
  habits,
  theme,
  today,
}: {
  currentMonth: number;
  currentYear: number;
  habits: Habit[];
  theme: ThemeKey;
  today: Date;
}) {
  if (habits.length === 0) return <EmptyState icon="📊" text="Tambah habit dulu untuk melihat grafik!" />;

  const totalDays = daysInMonth(currentMonth, currentYear);
  const labels = Array.from({ length: totalDays }, (_, index) => `${index + 1}`);
  const chartTextColor = theme === "dark" ? "#e7c8dc" : "#7a3b5e";
  const chartGridColor = theme === "dark" ? "#4a335866" : "#ffd6e755";
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartTextColor,
          font: { family: "Nunito", weight: 700 as const, size: 11 },
          boxWidth: 14,
          padding: 10,
        },
      },
    },
  };

  return (
    <section>
      <div className="section-head">
        <div className="section-title">Grafik Progress</div>
      </div>
      <div className="graph-grid">
        <ChartCard title="Progress Bulan Ini (%)">
          <Bar
            data={{
              labels: habits.map((habit) => `${habit.emoji} ${habit.name.slice(0, 12)}`),
              datasets: [
                {
                  data: habits.map((habit) =>
                    Math.min(100, Math.round((getMonthChecks(habit, currentMonth, currentYear) / habit.goal) * 100)),
                  ),
                  backgroundColor: habits.map((habit) => `${habit.barColor}cc`),
                  borderColor: habits.map((habit) => habit.barColor),
                  borderWidth: 2,
                  borderRadius: 10,
                },
              ],
            }}
            options={{
              ...chartOptions,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor },
                  max: 100,
                  ticks: { color: chartTextColor, callback: (value) => `${value}%` },
                },
                x: { grid: { display: false }, ticks: { color: chartTextColor } },
              },
            }}
          />
        </ChartCard>

        <ChartCard title="Akumulasi per Hari">
          <Line
            data={{
              labels,
              datasets: habits.map((habit) => {
                let cumulative = 0;
                return {
                  label: `${habit.emoji} ${habit.name.slice(0, 10)}`,
                  data: labels.map((label) => {
                    if (habit.checks[`${currentYear}-${currentMonth}-${label}`]) cumulative += 1;
                    return cumulative;
                  }),
                  borderColor: habit.barColor,
                  backgroundColor: `${habit.barColor}22`,
                  fill: true,
                  tension: 0.4,
                  borderWidth: 2.5,
                  pointRadius: 2,
                };
              }),
            }}
            options={{
              ...chartOptions,
              scales: {
                y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTextColor } },
                x: { grid: { display: false }, ticks: { color: chartTextColor } },
              },
            }}
          />
        </ChartCard>

        <ChartCard title="Completion Overview">
          <Doughnut
            data={{
              labels: habits.map((habit) => `${habit.emoji} ${habit.name.slice(0, 12)}`),
              datasets: [
                {
                  data: habits.map((habit) => getMonthChecks(habit, currentMonth, currentYear)),
                  backgroundColor: habits.map((habit) => `${habit.barColor}cc`),
                  borderColor: habits.map((habit) => habit.barColor),
                  borderWidth: 2,
                },
              ],
            }}
            options={{ ...chartOptions, cutout: "65%" }}
          />
        </ChartCard>

        <ChartCard title="Streak Saat Ini">
          <Bar
            data={{
              labels: habits.map((habit) => `${habit.emoji} ${habit.name.slice(0, 12)}`),
              datasets: [
                {
                  data: habits.map((habit) => getCurrentStreak(habit, today)),
                  backgroundColor: habits.map((habit) => `${habit.barColor}cc`),
                  borderColor: habits.map((habit) => habit.barColor),
                  borderWidth: 2,
                  borderRadius: 10,
                },
              ],
            }}
            options={{
              ...chartOptions,
              indexAxis: "y",
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  beginAtZero: true,
                  grid: { color: chartGridColor },
                  ticks: { color: chartTextColor, stepSize: 1 },
                },
                y: { grid: { display: false }, ticks: { color: chartTextColor } },
              },
            }}
          />
        </ChartCard>
      </div>
    </section>
  );
}

function JournalPanel({
  affirmation,
  cycleMeta,
  cycleSettings,
  entries,
  habits,
  isSavingCycle,
  isSavingJournal,
  journalForm,
  journalInsight,
  saveCycleSettings,
  saveJournalEntry,
  setCycleSettings,
  setJournalForm,
  todayDate,
  updateJournalCategory,
}: {
  affirmation: string;
  cycleMeta: PhaseMeta | null;
  cycleSettings: CycleSettings;
  entries: JournalEntry[];
  habits: Habit[];
  isSavingCycle: boolean;
  isSavingJournal: boolean;
  journalForm: JournalFormState;
  journalInsight: string;
  saveCycleSettings: () => void;
  saveJournalEntry: () => void;
  setCycleSettings: React.Dispatch<React.SetStateAction<CycleSettings>>;
  setJournalForm: React.Dispatch<React.SetStateAction<JournalFormState>>;
  todayDate: string;
  updateJournalCategory: (category: JournalCategory) => void;
}) {
  const phaseMoodEntries = entries.filter((entry) => entry.cyclePhase);
  const averageMood = entries.length
    ? (entries.reduce((sum, entry) => sum + entry.moodScore, 0) / entries.length).toFixed(1)
    : "-";
  const averageEnergy = entries.length
    ? (entries.reduce((sum, entry) => sum + entry.energyLevel, 0) / entries.length).toFixed(1)
    : "-";
  const habitLinkedEntries = entries.filter((entry) => getHabitCompletionCountForDate(habits, entry.entryDate) >= Math.max(1, Math.ceil(habits.length / 2)));
  const habitMood = habitLinkedEntries.length
    ? (habitLinkedEntries.reduce((sum, entry) => sum + entry.moodScore, 0) / habitLinkedEntries.length).toFixed(1)
    : "-";

  return (
    <section className="journal-layout">
      <div className="journal-grid">
        <article className="journal-card journal-card-wide">
          <div className="journal-head">
            <div>
              <div className="section-title">Daily Check-in</div>
              <p className="journal-sub">Versi cepat tapi tetap meaningful. Bukan cuma nulis bebas, tapi refleksi yang terarah.</p>
            </div>
            <span className="journal-date">{formatLongDate(todayDate)}</span>
          </div>

          <div className="journal-metrics">
            <label className="journal-slider-block">
              <span>Mood hari ini: <b>{journalForm.moodScore}/10</b></span>
              <input
                max={10}
                min={1}
                type="range"
                value={journalForm.moodScore}
                onChange={(event) =>
                  setJournalForm((current) => ({ ...current, moodScore: Number(event.target.value) }))
                }
              />
            </label>
            <label className="journal-slider-block">
              <span>Energy level: <b>{journalForm.energyLevel}/10</b></span>
              <input
                max={10}
                min={1}
                type="range"
                value={journalForm.energyLevel}
                onChange={(event) =>
                  setJournalForm((current) => ({ ...current, energyLevel: Number(event.target.value) }))
                }
              />
            </label>
          </div>

          <div className="journal-section-label">Emosi yang paling terasa</div>
          <div className="chip-row">
            {EMOTION_OPTIONS.map((emotion) => (
              <button
                className={`chip-button ${journalForm.emotions.includes(emotion) ? "active" : ""}`}
                key={emotion}
                onClick={() =>
                  setJournalForm((current) => ({
                    ...current,
                    emotions: toggleSelection(current.emotions, emotion),
                  }))
                }
                type="button"
              >
                {emotion}
              </button>
            ))}
          </div>

          <div className="journal-section-label">Tag harian</div>
          <div className="chip-row">
            {TAG_OPTIONS.map((tag) => (
              <button
                className={`chip-button ${journalForm.tags.includes(tag) ? "active" : ""}`}
                key={tag}
                onClick={() =>
                  setJournalForm((current) => ({
                    ...current,
                    tags: toggleSelection(current.tags, tag),
                  }))
                }
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="journal-section-label">Guided prompt</div>
          <div className="chip-row">
            {JOURNAL_CATEGORIES.map((category) => (
              <button
                className={`chip-button ${journalForm.promptCategory === category.key ? "active" : ""}`}
                key={category.key}
                onClick={() => updateJournalCategory(category.key)}
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="prompt-card">
            <div className="prompt-kicker">Prompt hari ini</div>
            <p>{journalForm.promptText}</p>
          </div>

          <div className="journal-field-grid">
            <label className="journal-field">
              <span>1 kalimat highlight harimu</span>
              <input
                type="text"
                value={journalForm.highlight}
                onChange={(event) =>
                  setJournalForm((current) => ({ ...current, highlight: event.target.value }))
                }
                placeholder="Contoh: Aku berhasil jujur soal apa yang aku rasakan."
              />
            </label>
            <label className="journal-field journal-field-full">
              <span>Refleksi singkat</span>
              <textarea
                rows={5}
                value={journalForm.content}
                onChange={(event) =>
                  setJournalForm((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="Tulis apa yang lagi terasa berat, melegakan, atau membuatmu bangga hari ini."
              />
            </label>
          </div>

          <div className="journal-actions">
            <button className="btn-add" disabled={isSavingJournal} onClick={saveJournalEntry} type="button">
              {isSavingJournal ? "Menyimpan..." : "Simpan Check-in"}
            </button>
            <span className="journal-helper">Entry disimpan per hari, jadi kamu bisa update tanpa bikin duplikat.</span>
          </div>
        </article>

        <article className="journal-card">
          <div className="section-title">Cycle Context</div>
          <p className="journal-sub">Biar journaling terasa relevan dengan ritme tubuhmu, bukan random.</p>

          <div className="journal-field-grid">
            <label className="journal-field">
              <span>Hari pertama haid terakhir</span>
              <input
                type="date"
                value={cycleSettings.lastPeriodStart}
                onChange={(event) =>
                  setCycleSettings((current) => ({ ...current, lastPeriodStart: event.target.value }))
                }
              />
            </label>
            <label className="journal-field">
              <span>Panjang siklus</span>
              <input
                max={40}
                min={20}
                type="number"
                value={cycleSettings.cycleLength}
                onChange={(event) =>
                  setCycleSettings((current) => ({ ...current, cycleLength: Math.max(20, Number(event.target.value) || 28) }))
                }
              />
            </label>
            <label className="journal-field">
              <span>Lama menstruasi</span>
              <input
                max={10}
                min={2}
                type="number"
                value={cycleSettings.periodLength}
                onChange={(event) =>
                  setCycleSettings((current) => ({ ...current, periodLength: Math.max(2, Number(event.target.value) || 5) }))
                }
              />
            </label>
          </div>

          <div className="cycle-state-card">
            <div className="cycle-phase-badge">{getPhaseLabel(cycleMeta?.phase ?? null)}</div>
            <div className="cycle-meta-line">
              {cycleMeta ? `Hari ke-${cycleMeta.cycleDay} siklusmu, perkiraan ${cycleMeta.daysUntilNextPeriod} hari lagi menuju periode berikutnya.` : "Belum ada data siklus."}
            </div>
            <p>{getPhaseInsight(cycleMeta?.phase ?? null)}</p>
          </div>

          <button className="btn-add" disabled={isSavingCycle} onClick={saveCycleSettings} type="button">
            {isSavingCycle ? "Menyimpan..." : "Simpan Cycle Settings"}
          </button>
        </article>

        <article className="journal-card">
          <div className="section-title">Affirmation</div>
          <p className="journal-sub">Kecil, tapi ini yang bikin user ingin balik lagi besok.</p>
          <div className="affirmation-card">“{affirmation}”</div>
        </article>

        <article className="journal-card">
          <div className="section-title">Insight</div>
          <p className="journal-sub">Ringkas, personal, dan cukup pintar untuk terasa “dipahami”.</p>
          <div className="insight-grid">
            <div className="insight-pill">
              <strong>{averageMood}</strong>
              <span>Rata-rata mood</span>
            </div>
            <div className="insight-pill">
              <strong>{averageEnergy}</strong>
              <span>Rata-rata energy</span>
            </div>
            <div className="insight-pill">
              <strong>{habitMood}</strong>
              <span>Mood saat habit jalan</span>
            </div>
            <div className="insight-pill">
              <strong>{phaseMoodEntries.length}</strong>
              <span>Entry dengan cycle data</span>
            </div>
          </div>
          <div className="insight-note">{journalInsight}</div>
        </article>

        <article className="journal-card journal-card-wide">
          <div className="section-title">Recent Entries</div>
          <p className="journal-sub">Supaya jurnalmu terasa hidup, bukan hilang setelah disimpan.</p>
          <div className="entry-list">
            {entries.length === 0 ? (
              <EmptyState icon="✍️" text="Belum ada entry journal. Mulai dari check-in pertamamu hari ini." />
            ) : (
              entries.slice(0, 7).map((entry) => (
                <div className="entry-card" key={entry.id}>
                  <div className="entry-top">
                    <span>{formatLongDate(entry.entryDate)}</span>
                    <span>
                      Mood {entry.moodScore}/10 · Energy {entry.energyLevel}/10
                    </span>
                  </div>
                  <div className="entry-prompt">{entry.promptText}</div>
                  {entry.highlight ? <div className="entry-highlight">{entry.highlight}</div> : null}
                  <div className="entry-meta-row">
                    <span>{entry.cyclePhase ? getPhaseLabel(entry.cyclePhase) : "No cycle context"}</span>
                    <span>{entry.emotions.join(", ") || "No emotions selected"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function ChartCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="graph-card">
      <h4>
        <Sparkles size={17} /> {title}
      </h4>
      <div className="chart-area">{children}</div>
    </article>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="big">{icon}</div>
      <p>{text}</p>
    </div>
  );
}
