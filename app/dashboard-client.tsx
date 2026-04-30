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
import { signOut } from "./actions/auth";
import { createClient } from "@/lib/supabase/client";

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
type TabKey = "daily" | "weekly" | "monthly" | "graphs";
type ThemeKey = "pink" | "lavender" | "minimal" | "dark";

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

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
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
  const [habits, setHabits] = useState<Habit[]>([]);
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
  const [isReady, setIsReady] = useState(false);
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);

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
      const { data, error } = await supabase.from("user_settings").select("theme").eq("user_id", userId).maybeSingle();

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

  const motivation = MOTIVATIONS[today.getDay() % MOTIVATIONS.length];
  const todayKey = dateKey(today);
  const doneToday = habits.filter((habit) => habit.checks[todayKey]).length;
  const bestStreak = habits.length ? Math.max(...habits.map(getBestStreak)) : 0;
  const todayRate = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;

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
    if (window.confirm("Hapus habit ini?")) {
      const previous = habits;
      setHabits((current) => current.filter((habit) => habit.id !== id));

      const { error } = await supabase.from("habits").delete().eq("id", id);

      if (error) {
        setCloudError(error.message);
        setHabits(previous);
      }
    }
  }

  async function toggleCheck(habitId: string, key: string) {
    const habit = habits.find((item) => item.id === habitId);
    const nextChecked = !habit?.checks[key];
    const previous = habits;

    setHabits((current) =>
      current.map((habit) =>
        habit.id === habitId
          ? { ...habit, checks: { ...habit.checks, [key]: !habit.checks[key] } }
          : habit,
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
        <div className="header-title">✨ My Habit Tracker</div>
        <div className="header-sub">Bangun kebiasaan terbaik versi kamu! 💖</div>
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

        {isLoadingHabits ? (
          <div className="cloud-loading">Memuat data habit dari Supabase...</div>
        ) : null}

        <section className="motivate-bar">
          <span className="motivate-emoji">{motivation.e}</span>
          <span>{motivation.t}</span>
        </section>

        <section className="stats-grid" aria-label="Ringkasan habit">
          <StatCard value={habits.length.toString()} label="Total Habits" />
          <StatCard value={doneToday.toString()} label="Done Today" />
          <StatCard value={`${bestStreak}🔥`} label="Best Streak" />
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
          <EmptyState icon="🌸" text="Belum ada habit! Tambahkan habit pertamamu di atas yuk~" />
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
        <span>🎯 Goal per bulan:</span>
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
        <span className="goal-detail">✅ Selesai: {done} kali</span>
        <span className="goal-detail">🏆 {pct >= 100 ? "GOAL TERCAPAI!" : `Sisa ${Math.max(0, habit.goal - done)} lagi`}</span>
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
