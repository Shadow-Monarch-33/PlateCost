import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  oldAvatarUrl: string | undefined
) {
  const fileExt = file.name.split('.').pop();
  const uniqueId = Math.random().toString(36).substring(2);
  const filePath = `${userId}/avatar-${uniqueId}.${fileExt}`;

  // 1. Upload new unique avatar
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    return { error: "Couldn't upload your profile picture. Please try again." };
  }

  // 2. Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);
  
  const newAvatarUrl = publicUrlData.publicUrl;

  // 3. Get current metadata to preserve it
  const { data: { user } } = await supabase.auth.getUser();
  const existingMetadata = user?.user_metadata || {};

  // 4. Update Auth metadata
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...existingMetadata,
      avatar_url: newAvatarUrl
    }
  });

  if (updateError) {
    // Attempt cleanup if metadata update fails
    await supabase.storage.from("avatars").remove([filePath]);
    return { error: "Couldn't update your profile picture. Please try again." };
  }

  // 5. Cleanup old avatar safely
  if (oldAvatarUrl && oldAvatarUrl.includes("avatars")) {
    try {
      const oldPath = oldAvatarUrl.split("avatars/")[1];
      if (oldPath && oldPath.startsWith(`${userId}/`)) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    } catch (e) {
      console.warn("Failed to delete old avatar", e);
    }
  }

  return { error: null, avatarUrl: newAvatarUrl };
}

export async function removeUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  oldAvatarUrl: string | undefined
) {
  // 1. Get current metadata to preserve it
  const { data: { user } } = await supabase.auth.getUser();
  const existingMetadata = user?.user_metadata || {};

  // 2. Clear avatar reference
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...existingMetadata,
      avatar_url: null
    }
  });

  if (updateError) {
    return { error: "Couldn't remove your profile picture. Please try again." };
  }

  // 3. Delete the old custom object
  if (oldAvatarUrl && oldAvatarUrl.includes("avatars")) {
    try {
      const oldPath = oldAvatarUrl.split("avatars/")[1];
      if (oldPath && oldPath.startsWith(`${userId}/`)) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    } catch (e) {
      console.warn("Failed to delete old avatar", e);
    }
  }

  return { error: null };
}
