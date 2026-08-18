import Link from "next/link";
import { NoteForm } from "@/components/learning/note-form";
import { requireUser } from "@/server/auth/current-user";
import { createDataAccess } from "@/server/data";
import { saveNoteAction } from "../../actions";

export default async function NewNotePage({ searchParams }: { searchParams: Promise<{ skillId?: string }> }) { const { skillId } = await searchParams; const user = await requireUser(); const data = await createDataAccess(); const [skills, tutorials] = await Promise.all([data.learning.skills.list(user.id), data.learning.tutorials.list(user.id)]); return <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-28"><Link href="/learning/notes" className="text-sm text-muted-foreground">← 知识笔记</Link><h1 className="mb-6 mt-2 text-3xl font-semibold">新建知识笔记</h1>{skills.length ? <NoteForm action={saveNoteAction.bind(null, null)} skills={skills} tutorials={tutorials} skillId={skillId}/> : <p className="rounded-3xl bg-surface-muted p-6 text-sm">请先<Link href="/learning/skills/new" className="ml-1 text-primary">新建一个技能</Link>。</p>}</main>; }
