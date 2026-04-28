import { QuizPlayer } from "@/components/quiz";

export default async function AdminQuizSimulationRunPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="min-h-[60vh]">
      <p className="mb-4 text-sm text-mist">Simulation mode (admin only, no leaderboard save)</p>
      <QuizPlayer code={code} simulation />
    </div>
  );
}
