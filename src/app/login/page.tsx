import type { Metadata } from "next";
import { signIn, signUp } from "./actions";

export const metadata: Metadata = { title: "登录" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold tracking-wide text-primary">KIKI PERSONAL OS</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">把今天过清楚。</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        登录后，你的任务、每日重点和复盘将安全保存到个人空间。
      </p>

      <form className="mt-10 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">邮箱</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="min-h-13 w-full rounded-2xl border border-border bg-surface px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">密码</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
            className="min-h-13 w-full rounded-2xl border border-border bg-surface px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/10"
            placeholder="至少 8 位"
          />
        </label>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            formAction={signIn}
            className="min-h-13 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            登录
          </button>
          <button
            formAction={signUp}
            className="min-h-13 rounded-2xl border border-border bg-surface px-5 font-semibold transition active:scale-[0.98]"
          >
            创建账号
          </button>
        </div>
      </form>
    </main>
  );
}
