"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";
import { getSafeDisplayName } from "@/application/auth/display-name";
import { uploadUserAvatar, removeUserAvatar } from "@/application/auth/avatar";
import Image from "next/image";

interface Props {
  userId: string;
  initialDisplayName: string | undefined;
  initialAvatarUrl: string | undefined;
  email: string | undefined;
  createdAt: string;
}

export function EditProfileForm({ userId, initialDisplayName, initialAvatarUrl, email, createdAt }: Props) {
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track the authoritative saved name vs the draft typed name
  const [savedDisplayName, setSavedDisplayName] = useState(initialDisplayName);
  const [draftDisplayName, setDraftDisplayName] = useState(getSafeDisplayName(initialDisplayName, email));
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const currentAvatarSrc = avatarPreview || "/images/default-avatar.jpeg";

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("Please choose a JPG, PNG, WebP, or GIF image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("That image is too large. Maximum size is 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setSuccess(false);
  };

  const cancelAvatarChange = () => {
    setAvatarFile(null);
    setAvatarPreview(initialAvatarUrl ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAvatarError(null);
  };

    const saveAvatar = async () => {
    if (!avatarFile) return;
    setIsUploading(true);
    setAvatarError(null);
    setSuccess(false);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: uploadErr, avatarUrl: newAvatarUrl } = await uploadUserAvatar(supabase, userId, avatarFile, initialAvatarUrl);

      if (uploadErr) {
        setAvatarError(uploadErr);
        setIsUploading(false);
        return;
      }

      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(true);
      router.refresh();
      setIsUploading(false);
    } catch {
      setAvatarError("An unexpected error occurred.");
      setIsUploading(false);
    }
  };

    const removeAvatar = async () => {
    setIsUploading(true);
    setAvatarError(null);
    setSuccess(false);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: removeErr } = await removeUserAvatar(supabase, userId, initialAvatarUrl);

      if (removeErr) {
        setAvatarError(removeErr);
        setIsUploading(false);
        return;
      }

      setAvatarPreview(null);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(true);
      router.refresh();
      setIsUploading(false);
    } catch {
      setAvatarError("An unexpected error occurred.");
      setIsUploading(false);
    }
  };

  const safeSavedDisplayName = getSafeDisplayName(savedDisplayName, email);

  const handleEdit = () => {
    setIsEditing(true);
    setSuccess(false);
    setError(null);
    setDraftDisplayName(safeSavedDisplayName);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setDraftDisplayName(safeSavedDisplayName); // Restore without saving
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    const trimmed = draftDisplayName.trim();
    if (!trimmed) {
      setError("Display name cannot be empty.");
      return;
    }
    
    if (trimmed.length > 50) {
      setError("Display name cannot exceed 50 characters.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: trimmed
        }
      });

      if (updateError) {
        setError(updateError.message);
        setIsSaving(false);
        return;
      }

      if (data.user) {
        // Use the returned authoritative user metadata
        setSavedDisplayName(data.user.user_metadata?.display_name as string | undefined);
        setDraftDisplayName(getSafeDisplayName(data.user.user_metadata?.display_name, email));
      } else {
        setSavedDisplayName(trimmed);
      }

      setSuccess(true);
      setIsEditing(false);
      setIsSaving(false);

      // Trigger a server-side refresh so the navigation/header reads the new name
      router.refresh();
      
    } catch {
      setError("An unexpected error occurred while saving.");
      setIsSaving(false);
    }
  };

  const memberSince = createdAt 
    ? new Date(createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="max-w-xl rounded-xl border border-zinc-200 bg-white shadow-2xs">
      <div className="p-6">
        <div className="flex items-start gap-6">
          
          <div className="flex flex-col items-center gap-3 shrink-0">
            <Image width={80} height={80}
              src={currentAvatarSrc}
              alt={safeSavedDisplayName}
              className="h-20 w-20 rounded-full object-cover ring-1 ring-zinc-200"
            />
            {!isEditing && (
              <div className="flex flex-col gap-1 w-full text-center">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,image/gif" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleAvatarSelect} 
                />
                
                {avatarFile ? (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={saveAvatar}
                      disabled={isUploading}
                      className="text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-md py-1 px-2 disabled:opacity-50"
                      aria-label="Save photo"
                    >
                      {isUploading ? "Uploading..." : "Save photo"}
                    </button>
                    <button
                      onClick={cancelAvatarChange}
                      disabled={isUploading}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-md py-1 px-2 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 py-1"
                      aria-label="Change profile picture"
                    >
                      Change photo
                    </button>
                    {initialAvatarUrl && (
                      <button
                        onClick={removeAvatar}
                        disabled={isUploading}
                        className="text-xs font-medium text-red-600 hover:text-red-700 py-1"
                        aria-label="Remove profile picture"
                      >
                        Remove photo
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          
          <div className="flex-1 min-w-0 pt-1">
            
            {success && !isEditing && (
              <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
                Profile updated successfully.
              </div>
            )}
            
            {(error || avatarError) && !isEditing && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error || avatarError}
              </div>
            )}


            {!isEditing ? (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Display Name</p>
                    <h2 className="text-lg font-semibold text-zinc-900 truncate">
                      {safeSavedDisplayName}
                    </h2>
                  </div>
                  <button
                    onClick={handleEdit}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="mb-2">
                  <label htmlFor="displayName" className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    maxLength={50}
                    value={draftDisplayName}
                    onChange={(e) => setDraftDisplayName(e.target.value)}
                    className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-2xs focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                    disabled={isSaving}
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-zinc-700 truncate">{email}</p>
            </div>
          </div>
        </div>
      </div>

      {memberSince && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 rounded-b-xl">
          <p className="text-sm text-zinc-500">
            Member since {memberSince}
          </p>
        </div>
      )}
    </div>
  );
}
