import { WuxiaShell } from "@/components/layout";
import { QuizPlayer } from "@/components/quiz";

export default async function PublicQuizPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <WuxiaShell>
      <div className="min-h-[50vh]">
        <p className="mb-6 text-center text-sm text-mist">Guild quiz (join code)</p>
        <QuizPlayer code={code} />
      </div>
    </WuxiaShell>
  );
}
