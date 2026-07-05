export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <main className="flex w-full max-w-2xl flex-col items-center text-center">
        <p className="mb-4 text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
          TrExcel 2027
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          Welcome
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
          Details coming soon..
        </p>
      </main>
    </div>
  );
}
