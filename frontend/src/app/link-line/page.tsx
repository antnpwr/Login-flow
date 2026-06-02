import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LinkLineAccount } from "@/components/LinkLineAccount";

export default async function LinkLinePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.lineLinked) {
    redirect("/profile");
  }

  return (
    <section className="auth-screen">
      <div className="auth-card plain-auth-card">
        <div className="auth-mark">
          LINE
        </div>
        <h1 className="plain-auth-title">Link LINE</h1>
        <LinkLineAccount />
      </div>
    </section>
  );
}
