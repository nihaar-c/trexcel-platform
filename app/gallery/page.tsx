const featuredImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/gallery.jpeg`;
const googlePhotosUrl = "https://photos.app.goo.gl/uxzndFqEZxYn8dkG8";

export default function GalleryPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="mb-1 text-sm font-semibold tracking-widest text-brand-dark uppercase dark:text-brand-gold">
          TrExcel 2026-2027
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Photo &amp; Video Gallery
          </h1>
          <a
            href={googlePhotosUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-gold bg-brand-gold/10 px-4 py-1 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-gold/30 dark:text-brand-gold"
          >
            📸 Open in Google Photos →
          </a>
        </div>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Photos and videos from TrExcel events and competitions.
        </p>

        {/* Featured image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={featuredImageUrl}
          alt="TrExcel 2026-2027 competition"
          className="mt-8 w-full rounded-xl object-cover shadow-md"
        />
      </div>
    </div>
  );
}
