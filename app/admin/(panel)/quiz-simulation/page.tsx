import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

type SimQuiz = {
  id: string;
  title: string;
  join_code: string;
  quiz_type: "trial" | "tournament";
  opens_at: string | null;
  closes_at: string | null;
};

export default async function AdminQuizSimulationPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quizzes")
    .select("id, title, join_code, quiz_type, opens_at, closes_at")
    .eq("status", "simulation")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as SimQuiz[];

  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Quiz simulation</h1>
      <p className="mt-2 text-mist">
        Simulation quizzes are admin-only test runs. Attempts are not written to the leaderboard.
      </p>
      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="text-mist">No quizzes in simulation mode.</p>}
        {rows.map((q) => (
          <Card key={q.id} className="!py-4">
            <h2 className="font-medium text-foreground">{q.title}</h2>
            <p className="text-xs text-mist">
              {q.quiz_type === "tournament" ? "Heavenly Tournament" : "Sect Trial"} · code {q.join_code}
            </p>
            <Link
              href={`/admin/quiz-simulation/${q.join_code}`}
              className="mt-2 inline-block rounded-lg border border-gold/30 px-3 py-1.5 text-sm text-gold"
            >
              Open simulation room
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
