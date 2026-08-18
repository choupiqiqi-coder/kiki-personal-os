import Link from "next/link";
import { TutorialForm } from "@/components/learning/tutorial-form";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { saveTutorialAction } from "../../actions";

export default async function NewTutorialPage({ searchParams }: { searchParams: Promise<{ skillId?: string }> }) { const { skillId } = await searchParams; const user = await requireUser(); const data = await createDataAccess(); const skills = await data.learning.skills.list(user.id); return <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-28"><Link href="/learning/tutorials" className="text-sm text-muted-foreground">← 教程收藏</Link><h1 className="mb-6 mt-2 text-3xl font-semibold">收藏教程</h1><TutorialForm action={saveTutorialAction.bind(null, null)} skills={skills} skillId={skillId}/></main>; }
