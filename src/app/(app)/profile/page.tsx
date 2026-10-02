import Image from "next/image";
import { requireAuthenticatedUser } from "@/infrastructure/auth/require-user";
import { getSafeDisplayName } from "@/application/auth/display-name";

export const metadata = {
  title: "Profile — PlateCost",
};

export default async function ProfilePage() {
  const user = await requireAuthenticatedUser();
  const safeDisplayName = getSafeDisplayName(user.displayName, user.email);

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

      <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center gap-6">
          <Image width={80} height={80}
            src="/images/default-avatar.jpeg"
            alt={safeDisplayName}
            className="h-20 w-20 rounded-full object-cover ring-1 ring-zinc-200"
          />
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {safeDisplayName}
            </h2>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
          <p className="text-sm text-zinc-600">
            Basic account information is currently read-only. Avatar customization and profile editing will be added in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
