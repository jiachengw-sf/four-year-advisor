import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">4-Year Advisor</h1>
      <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
        Copy an agent&apos;s context, run the agent in Superhuman, then paste its JSON reply back here. Replies are
        validated and saved to the <code>agent_outputs</code> blackboard.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          <Link href="/admin" className="underline">Admin</Link>: load seed data and create the demo student.
        </li>
        <li>
          <Link href="/agents" className="underline">Agents</Link>: copy context, paste replies.
        </li>
      </ol>
    </div>
  );
}
