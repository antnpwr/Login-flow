import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const name = session.user.name ?? "Unknown";
  const initial = name.charAt(0).toUpperCase();
  const roles = session.user.roles.length
    ? session.user.roles.join(", ")
    : "No realm role";

  return (
    <section className="profile-screen">
      <div className="profile-heading">
        <h1>Profile</h1>
        <LogoutButton />
      </div>

      <div className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {initial}
        </div>

        <dl className="profile-list">
          <div className="profile-row">
            <dt className="profile-label">Name</dt>
            <dd className="profile-value">{name}</dd>
          </div>
          <div className="profile-row">
            <dt className="profile-label">Username</dt>
            <dd className="profile-value">
              {session.user.username ?? "Unknown"}
            </dd>
          </div>
          <div className="profile-row">
            <dt className="profile-label">Email</dt>
            <dd className="profile-value">{session.user.email ?? "No email"}</dd>
          </div>
          <div className="profile-row">
            <dt className="profile-label">Roles</dt>
            <dd className="profile-value">{roles}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
