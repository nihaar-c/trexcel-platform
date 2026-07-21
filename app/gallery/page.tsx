export default function GalleryPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-lg">
        <p className="mb-1 text-sm font-semibold tracking-widest text-brand-dark uppercase dark:text-brand-gold">
          TrExcel 2027
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Photo &amp; Video Gallery
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Photos and videos from TrExcel events and competitions.
        </p>

        <a
          href="https://photos.app.goo.gl/uxzndFqEZxYn8dkG8"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center justify-between rounded-xl border-2 border-brand-gold bg-white px-6 py-5 shadow-sm transition-colors hover:bg-brand-gold/10 dark:bg-zinc-900"
        >
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">Open Google Photos</p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              View the full TrExcel photo and video collection
            </p>
          </div>
          <span className="ml-4 text-xl text-brand-dark dark:text-brand-gold">→</span>
        </a>
      </div>
    </div>
  );
}
