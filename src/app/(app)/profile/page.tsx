import { requireAuthenticatedUser } from "@/infrastructure/auth/require-user";
import { EditProfileForm } from "./edit-profile-form";

export const metadata = {
  title: "Profile — PlateCost",
};

export default async function ProfilePage() {
  const user = await requireAuthenticatedUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Account Center
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your PlateCost account and profile
        </p>
      </div>

      <EditProfileForm
        initialDisplayName={user.displayName}
        email={user.email}
        createdAt={user.createdAt}
      />
    </div>
  );
}
