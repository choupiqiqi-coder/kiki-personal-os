"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", label: "首页" },
  { href: "/tasks", label: "任务" },
  { href: "/ai", label: "AI" },
  { href: "/content", label: "内容" },
  { href: "/learning", label: "学习" },
  { href: "/health", label: "身体" },
  { href: "/finance", label: "财富" },
  { href: "/profile", label: "我的" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主导航"
      className="app-bottom-navigation fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:static md:border-t-0 md:bg-transparent"
    >
      <div className="mx-auto grid h-16 max-w-4xl grid-cols-8 px-1 md:flex md:h-auto md:justify-end md:gap-2 md:px-0">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-xl px-1 text-xs font-medium transition-colors md:min-h-10 md:px-3 md:text-sm ${
                active
                  ? "text-primary md:bg-surface-muted"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
