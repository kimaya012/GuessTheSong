export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <article className="panel rounded-3xl p-7 sm:p-10 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-foreground/85 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-foreground/85">
        <h1 className="font-display text-5xl">{title}</h1>
        <p className="!mt-2 text-sm !text-muted-foreground">Last updated {updated}</p>
        {children}
      </article>
    </main>
  );
}
