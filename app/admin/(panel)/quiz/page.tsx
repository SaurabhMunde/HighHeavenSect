import { QuizList } from "@/components/admin-quiz-list";

export default function AdminQuizPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Quiz manager</h1>
      <p className="mt-2 text-mist">
        Build Kahoot-style rounds: questions, timer, schedule, and join code for
        the public <code className="text-gold/80">/quiz/…</code> page.
      </p>
      <div className="mt-6">
        <QuizList />
      </div>
      <p className="mt-6 text-sm text-mist">
        After creating a quiz, open it to add questions, then set status to{" "}
        <strong className="text-foreground">live</strong> when ready. Players use
        the join link below each quiz.
      </p>
    </div>
  );
}
