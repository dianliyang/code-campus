export default function PageFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full">
      <header className="mb-6 pb-4 border-b border-slate-200">
        <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500 mt-2">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
