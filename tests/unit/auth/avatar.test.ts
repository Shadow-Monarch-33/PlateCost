/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadUserAvatar, removeUserAvatar } from '@/application/auth/avatar';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Avatar Helpers', () => {
  let mockSupabase: any;
  let mockUpload: any;
  let mockGetPublicUrl: any;
  let mockGetUser: any;
  let mockUpdateUser: any;
  let mockRemove: any;

  beforeEach(() => {
    mockUpload = vi.fn().mockResolvedValue({ error: null });
    mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } });
    mockGetUser = vi.fn().mockResolvedValue({ data: { user: { user_metadata: { display_name: 'Test' } } } });
    mockUpdateUser = vi.fn().mockResolvedValue({ error: null });
    mockRemove = vi.fn().mockResolvedValue({ error: null });

    mockSupabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
          remove: mockRemove,
        }),
      },
      auth: {
        getUser: mockGetUser,
        updateUser: mockUpdateUser,
      },
    } as unknown as SupabaseClient;
  });

  describe('uploadUserAvatar', () => {
    it('uploads file and updates user metadata', async () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const result = await uploadUserAvatar(mockSupabase, 'user-123', file, undefined);

      expect(result.error).toBeNull();
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');

      // Verify upload path starts with user id
      expect(mockUpload.mock.calls[0][0]).toMatch(/^user-123\/avatar-.+\.png$/);
      
      // Verify metadata update preserves display_name
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: {
          display_name: 'Test',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      });
    });

    it('returns error if upload fails', async () => {
      mockUpload.mockResolvedValueOnce({ error: new Error('Upload failed') });
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      
      const result = await uploadUserAvatar(mockSupabase, 'user-123', file, undefined);
      
      expect(result.error).toBe('Couldn\'t upload your profile picture. Please try again.');
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('cleans up old avatar if provided', async () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      await uploadUserAvatar(mockSupabase, 'user-123', file, 'https://example.com/avatars/user-123/old.png');

      expect(mockRemove).toHaveBeenCalledWith(['user-123/old.png']);
    });
  });

  describe('removeUserAvatar', () => {
    it('clears avatar metadata and preserves display_name', async () => {
      const result = await removeUserAvatar(mockSupabase, 'user-123', 'https://example.com/avatars/user-123/old.png');

      expect(result.error).toBeNull();
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: {
          display_name: 'Test',
          avatar_url: null
        }
      });
      expect(mockRemove).toHaveBeenCalledWith(['user-123/old.png']);
    });

    it('returns error if metadata update fails', async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: new Error('Update failed') });
      const result = await removeUserAvatar(mockSupabase, 'user-123', undefined);

      expect(result.error).toBe('Couldn\'t remove your profile picture. Please try again.');
      expect(mockRemove).not.toHaveBeenCalled(); // Shouldn't delete if metadata update failed
    });
  });
});
