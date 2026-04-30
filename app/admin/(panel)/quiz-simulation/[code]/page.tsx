import { QuizPlayer } from "@/components/quiz";

export default async function AdminQuizSimulationRunPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="min-h-[60vh]">
      <p className="mb-4 text-sm text-mist">
        Simulation (admin): Heavenly Tournament runs in a separate scope; Sect Trial uses the normal
        player flow but scores are not saved—safe to rehearse repeatedly.
      </p>
      <QuizPlayer code={code} simulation />
    </div>
  );
}
