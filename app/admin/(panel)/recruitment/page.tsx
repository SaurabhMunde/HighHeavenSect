import { RecruitmentManager } from "@/components/admin-recruitment-manager";

export default function AdminRecruitmentPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-bright">Recruitment tracker</h1>
      <p className="mt-2 text-mist">
        Recruiter, recruit, and the 5-day activity check. Top recruiters are ranked by
        valid referrals.
      </p>
      <div className="mt-6">
        <RecruitmentManager />
      </div>
    </div>
  );
}
