import Link from "next/link";

const CATEGORIES = [
  {
    title: "STEM",
    description:
      "Submit an 8-minute video covering engineering, statistics, or research topics. All three team members must present.",
  },
  {
    title: "Art",
    description:
      "A 5-minute presentation — digital or physical — with a voiceover explanation and a 3–5 sentence description connecting the work to the competition theme.",
  },
  {
    title: "Fitness",
    description:
      "All members complete as many push-ups as possible in 2 minutes, then hold a plank for 60 seconds. Documented on video (max 10 minutes).",
  },
];

const TIMELINE = [
  { date: "Mid-August 2026", event: "Registration Opens" },
  { date: "October 15, 2026", event: "Checkpoint 1 — Project Proposal" },
  { date: "October 31, 2026", event: "Registration Deadline" },
  { date: "November 15, 2026", event: "Checkpoint 2 — Progress Update" },
  { date: "February 8, 2027", event: "Checkpoint 3 — Final Submission" },
  {
    date: "Sat, Feb 20, 2027",
    event: "In-Person Finals & Awards",
    detail:
      "Santa Clara County Office of Education · 1290 Ridder Park Dr, San Jose, CA 95131",
  },
];

const AWARDS = [
  { emoji: "🏆", place: "Grand Prize", amount: "$9,000", note: "$3,000/student" },
  { emoji: "🥈", place: "Second Place", amount: "$3,000", note: "$1,000/student" },
  { emoji: "🥉", place: "Third Place", amount: "$1,500", note: "$500/student" },
  { emoji: "🎖", place: "Participation", amount: "$150", note: "per team + certs" },
  { emoji: "🏅", place: "Category Excellence", amount: "$225", note: "per team" },
];

const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/logo.jpg`;
const heroImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/logo-header.jpg`;

const SPONSOR_LOGOS = [
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/t2.jpg`,
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/t1.jpg`,
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/t3.jpeg`,
];

export default function Home() {
  return (
    <div className="bg-white dark:bg-zinc-950">
      {/* Hero — image background with gold overlay */}
      <section
        className="relative flex flex-col items-center px-6 py-32 text-center"
        style={{
          backgroundImage: `url(${heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center 70%",
        }}
      >
        {/* Gold overlay */}
        <div className="absolute inset-0 bg-brand-gold/80" />
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="TrExcel logo"
            width={160}
            height={160}
            className="mb-6 h-40 w-40 rounded-full bg-white object-contain p-2 shadow-lg"
          />
          <h1 className="max-w-4xl text-6xl font-bold tracking-tight text-zinc-900 sm:text-7xl">
            TrExcel 2026-2027
          </h1>
          <p className="mt-3 rounded-full bg-white/70 px-5 py-1.5 text-xl font-bold uppercase tracking-wide text-zinc-900 shadow-sm">
            Theme: AI for Equity
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-800">
            A high school competition combining STEM, Art, and Fitness — inspiring students from underserved communities to learn, create, and lead.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/login"
              className="rounded-md bg-brand-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark-hover"
            >
              Register your team
            </Link>
            <a
              href="#about"
              className="rounded-md border-2 border-brand-dark px-6 py-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-black/10"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Content — full width, generous padding */}
      <div className="mx-auto w-full max-w-7xl px-8 pb-24 pt-16">

        {/* About — full width */}
        <section id="about" className="mb-16">
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-brand-dark uppercase">
            About
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              TrExcel is a multi-disciplinary competition designed to inspire, empower, and nurture high school students through interdisciplinary learning. Teams of three compete across all three categories — STEM, Art, and Fitness — with an emphasis on equity and support for participants from underserved communities.
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-zinc-500 sm:grid-cols-2 dark:text-zinc-400">
              {[
                "Teams of exactly 3 high school students",
                "All members must compete in every category",
                "Parental consent required at registration",
                "In-person finals attendance is mandatory for scholarship eligibility",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-brand-gold">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Categories — 3 columns */}
        <section className="mb-16">
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-brand-dark uppercase">
            Competition Consists of Categories
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {CATEGORIES.map(({ title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {title}
                </p>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline + Awards side by side */}
        <div className="mb-16 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-xs font-semibold tracking-widest text-brand-dark uppercase">
              Competition Timeline
            </h2>
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
              {TIMELINE.map(({ date, event, detail }, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{event}</span>
                    {detail && (
                      <span className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {detail}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-gold/20 px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                    {date}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-semibold tracking-widest text-brand-dark uppercase">
              Awards
            </h2>
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
              {AWARDS.map(({ emoji, place, amount, note }) => (
                <div key={place} className="flex items-center gap-3 px-5 py-4">
                  <span className="text-xl">{emoji}</span>
                  <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{place}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{amount}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">({note})</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-lg font-semibold text-brand-dark dark:text-brand-gold">
              Every participating team is recognized and celebrated.
            </p>
          </section>
        </div>

        {/* Financial Learning Requirement */}
        <section className="mb-16">
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-brand-dark uppercase">
            Financial Learning Requirement
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              As part of the TrExcel Competition program, all participants are required to complete the Financial Learning Modules offered by Meriwest Credit Union in order to qualify for the next round of the competition. Access to the learning modules will be provided after registration.
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Successful completion of these modules is mandatory for advancement. Participants who stay through the full competition will also become eligible for the following rewards:
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-zinc-500 sm:grid-cols-2 dark:text-zinc-400">
              {[
                "Certificate of Completion",
                "$25 account opening credit from Meriwest Credit Union",
                "Bonus raffle entries for thoughtful feedback shared with Meriwest",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-brand-gold">—</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              This requirement ensures that every participant not only engages in the competition but also builds valuable financial literacy skills that will support their future growth — learning in bite-sized lessons, earning points and rewards while you learn.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-widest text-brand-dark uppercase">
            Contact
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-8">
              <a
                href="mailto:trexceladmin@empowerexcel.org"
                className="font-medium text-brand-dark hover:underline"
              >
                trexceladmin@empowerexcel.org
              </a>
              <a
                href="mailto:info@empowerexcel.org"
                className="font-medium text-brand-dark hover:underline"
              >
                info@empowerexcel.org
              </a>
            </div>
          </div>
        </section>

        {/* Sponsors */}
        <section className="mt-16">
          <h2 className="mb-6 text-center text-xs font-semibold tracking-widest text-brand-dark uppercase">
            Our Sponsors
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {SPONSOR_LOGOS.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`Sponsor ${i + 1}`}
                className="h-16 w-auto object-contain sm:h-20"
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
