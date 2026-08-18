"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    return { ok: false, error: "请输入有效邮箱，密码至少 8 位。" } as const;
  }

  return { ok: true, email, password } as const;
}

export async function signIn(formData: FormData) {
  const input = credentials(formData);
  if (!input.ok) redirect(`/login?error=${encodeURIComponent(input.error)}`);

  const client = await createClient();
  const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error) redirect(`/login?error=${encodeURIComponent("登录失败，请检查邮箱和密码。")}`);

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const input = credentials(formData);
  if (!input.ok) redirect(`/login?error=${encodeURIComponent(input.error)}`);

  const client = await createClient();
  const { data, error } = await client.auth.signUp({ email: input.email, password: input.password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (!data.session) {
    redirect(`/login?message=${encodeURIComponent("注册成功，请先查收验证邮件。")}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const client = await createClient();
  await client.auth.signOut();
  redirect("/login");
}
