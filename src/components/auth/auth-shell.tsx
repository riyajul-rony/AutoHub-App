import Link from "next/link";
import { Zap } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="float-in w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2">
            <Zap size={20} />
          </span>
          <span className="gradient-text">AutoHub</span>
        </Link>
        <div className="glass rounded-3xl p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-5 text-center text-sm text-muted">{footer}</p>}
      </div>
    </main>
  );
}
