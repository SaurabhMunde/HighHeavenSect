import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizQuestionEditor } from "@/components/admin";

export default async function AdminQuizEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, time_limit_seconds")
    .eq("id", id)
    .single();
  if (!quiz) notFound();
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">
        Questions: {quiz.title}
      </h1>
      <p className="mt-1 text-mist">Timer: {quiz.time_limit_seconds}s per question</p>
      <div className="mt-6">
        <QuizQuestionEditor quizId={quiz.id} />
      </div>
    </div>
  );
}
