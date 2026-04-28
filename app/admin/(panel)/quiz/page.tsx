import { QuizList } from "@/components/admin";

export default function AdminQuizPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Quiz manager</h1>
      <p className="mt-2 text-mist">
        Build Sect Trial and Heavenly Tournament quizzes with timers, schedule, and join code for
        the public <code className="text-gold/80">/quiz/…</code> page.
      </p>
      <div className="mt-6">
        <QuizList />
      </div>
      <p className="mt-6 text-sm text-mist">
        Questions are editable only in <strong className="text-foreground">draft</strong>.
        Move quizzes to <strong className="text-foreground">simulation</strong> for admin-only testing,
        then set to <strong className="text-foreground">live</strong> when ready for players.
      </p>
    </div>
  );
}
