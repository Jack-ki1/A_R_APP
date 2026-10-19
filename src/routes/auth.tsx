import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/br-ui";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    if (!isSupabaseConfigured()) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (roles?.length) throw redirect({ to: "/radar" });
      await supabase.auth.signOut();
    }
  },
  component: SignIn,
});

function SignIn() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="w-full max-w-lg space-y-4 rounded-2xl border bg-panel p-7 shadow-xl">
          <Logo />
          <div>
            <h1 className="text-xl font-semibold">Backend setup required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The frontend is running, but it cannot reach Supabase until the public project URL and
              publishable key are configured.
            </p>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              Copy <code>.env.example</code> to <code>.env</code>.
            </li>
            <li>
              Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> from
              your Supabase project settings.
            </li>
            <li>
              Set the matching server variables <code>SUPABASE_URL</code> and{" "}
              <code>SUPABASE_PUBLISHABLE_KEY</code>, then restart the dev server.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Never put a service-role key in a variable beginning with <code>VITE_</code>.
          </p>
        </section>
      </main>
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (authError)
      setError("Sign-in failed. Check your credentials or ask an administrator for access.");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl border bg-panel p-7 shadow-xl"
      >
        <Logo />
        <div>
          <h1 className="text-xl font-semibold">Team sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Breakout Radar is a private A&amp;R workspace. Access is invite only.
          </p>
        </div>
        <label className="block space-y-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="h-10 w-full rounded-md border bg-background px-3"
          />
        </label>
        <label className="block space-y-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-10 w-full rounded-md border bg-background px-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="h-10 w-full rounded-md bg-primary font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-muted-foreground">
          Ask your workspace administrator to invite you. Self-service registration is disabled.
        </p>
      </form>
    </main>
  );
}
