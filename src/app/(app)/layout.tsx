import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/layout/app-navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function ApplicationLayout({ children }: LayoutProps<"/">) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");

  await client.from("profiles").upsert(
    {
      id: user.id,
      display_name: user.email?.split("@")[0] ?? "Kiki",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  return (
    <div className="flex min-h-screen min-h-dvh flex-col">
      <header className="app-header border-b border-border bg-surface">
        <div className="mx-auto flex min-h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Kiki Personal OS
          </Link>
          <div className="hidden md:block">
            <AppNavigation />
          </div>
          <form action={signOut} className="hidden md:block">
            <button className="text-sm text-muted-foreground hover:text-foreground">退出</button>
          </form>
        </div>
      </header>
      {children}
      <div className="md:hidden">
        <AppNavigation />
      </div>
    </div>
  );
}
