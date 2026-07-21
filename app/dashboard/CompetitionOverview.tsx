const CHECKPOINTS = [
  {
    label: "Checkpoint 1 – Project Proposal",
    date: "October 15, 2026",
    description:
      "Submit project concepts and research plans. STEM teams provide background research and proof of concept. Receive feedback from reviewers.",
  },
  {
    label: "Checkpoint 2 – Progress Update",
    date: "November 15, 2026",
    description:
      "Submit photos or videos showing project progress. Share accomplishments, challenges, and lessons learned.",
  },
  {
    label: "Checkpoint 3 – Final Submission",
    date: "February 8, 2027",
    description:
      "Submit final project videos and supporting materials. Materials are reviewed by judges prior to the in-person finals.",
  },
];

const AWARDS = [
  { emoji: "🏆", label: "Grand Prize", amount: "$9,000", note: "$3,000 per student" },
  { emoji: "🥈", label: "Second Place", amount: "$3,000", note: "$1,000 per student" },
  { emoji: "🥉", label: "Third Place", amount: "$1,500", note: "$500 per student" },
  { emoji: "🎖", label: "Participation Award", amount: "$150", note: "per team + certificates" },
  { emoji: "🏅", label: "Category Excellence", amount: "$225", note: "per team" },
];

const sectionCls = "border-t border-zinc-100 pt-5 dark:border-zinc-800";
const headingCls = "mb-3 text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500";

export default function CompetitionOverview() {
  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Theme */}
      <div>
        <p className={headingCls}>2026–2027 Theme</p>
        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          AI for Equity
        </p>
      </div>

      {/* Timeline */}
      <div className={sectionCls}>
        <p className={headingCls}>Competition Timeline</p>
        <ul className="flex flex-col gap-1.5 text-zinc-600 dark:text-zinc-400">
          <li className="flex justify-between gap-4">
            <span>Registration Opens</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">Mid-August 2026</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Registration Deadline</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">October 31, 2026</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Final Competition</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">February 2027</span>
          </li>
        </ul>
      </div>

      {/* Checkpoints */}
      <div className={sectionCls}>
        <p className={headingCls}>Project Checkpoints</p>
        <div className="flex flex-col gap-4">
          {CHECKPOINTS.map(({ label, date, description }) => (
            <div key={label}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {date}
                </span>
              </div>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Finals note */}
      <div className={sectionCls}>
        <p className={headingCls}>Final Competition</p>
        <p className="text-zinc-600 dark:text-zinc-400">
          February 2027 — Top teams present their projects live before judges, participate in the fitness challenge, and compete for scholarships.
        </p>
      </div>

      {/* Awards */}
      <div className={sectionCls}>
        <p className={headingCls}>Awards</p>
        <div className="flex flex-col gap-2">
          {AWARDS.map(({ emoji, label, amount, note }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-base">{emoji}</span>
              <span className="flex-1 text-zinc-700 dark:text-zinc-300">{label}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{amount}</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">({note})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
