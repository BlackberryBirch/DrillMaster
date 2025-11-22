# Plan: Anonymous User Viewing of Drill Revisions

## Overview
Allow anonymous users to view a specific revision of a drill when the owner provides them with a shareable link. This feature will enable read-only access to drills without requiring authentication.

## Current Architecture Analysis

### Existing Components
- **Routing**: React Router with routes `/` (home) and `/drill/:id` (editor)
- **Database**: Supabase with `drills` and `drill_versions` tables
- **Authentication**: Required for all drill operations (via `drillService.ensureAuthenticated()`)
- **Storage**: Audio files stored in Supabase Storage with signed URLs
- **Version System**: Versions stored in `drill_versions` table with `version_number`

### Key Constraints
- All current service methods require authentication
- Audio files use signed URLs that expire (1 hour)
- Storage paths are user-scoped (`user_id/drillId/filename`)
- No existing sharing mechanism

## Implementation Steps

### Phase 1: Database Schema Updates

#### 1.1 Create Share Links Table (Optional - Alternative Approach)
**Option A: Dedicated share_links table**
```sql
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  share_token TEXT UNIQUE NOT NULL, -- Cryptographically secure random token
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_share_links_token ON share_links(share_token);
CREATE INDEX idx_share_links_drill_version ON share_links(drill_id, version_number);
```

**Option B: Use existing drill_versions table with public access flag**
- Add `is_public` boolean column to `drill_versions`
- Add `share_token` TEXT column to `drill_versions`
- Simpler but less flexible for future features

**Recommendation**: Option A provides better separation of concerns and allows for:
- Multiple share links per version
- Link expiration
- Access tracking
- Revocation without affecting the version itself

#### 1.2 Update RLS (Row Level Security) Policies
```sql
-- Allow anonymous users to read share_links
CREATE POLICY "Allow anonymous read of share_links"
  ON share_links FOR SELECT
  USING (true);

-- Allow authenticated users to create share links for their drills
CREATE POLICY "Users can create share links for their drills"
  ON share_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drills
      WHERE drills.id = share_links.drill_id
      AND drills.user_id = auth.uid()
    )
  );

-- Allow drill owners to manage their share links
CREATE POLICY "Users can manage their share links"
  ON share_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM drills
      WHERE drills.id = share_links.drill_id
      AND drills.user_id = auth.uid()
    )
  );
```

#### 1.3 Update drill_versions RLS for Anonymous Access
```sql
-- Allow anonymous users to read versions via share links
-- This requires a function to check if a share link exists
CREATE OR REPLACE FUNCTION can_access_version(
  p_drill_id UUID,
  p_version_number INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM share_links
    WHERE share_links.drill_id = p_drill_id
    AND share_links.version_number = p_version_number
    AND (share_links.expires_at IS NULL OR share_links.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Allow anonymous read via share links"
  ON drill_versions FOR SELECT
  USING (
    can_access_version(drill_id, version_number)
  );
```

### Phase 2: Backend Service Updates

#### 2.1 Create Share Service
**File**: `src/services/shareService.ts`

```typescript
import { supabase } from '../lib/supabase';
import { DatabaseResult } from '../types/database';
import crypto from 'crypto'; // or use a library like nanoid

export interface ShareLink {
  id: string;
  drill_id: string;
  version_number: number;
  share_token: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  access_count: number;
  last_accessed_at: string | null;
}

export interface CreateShareLinkInput {
  drillId: string;
  versionNumber: number;
  expiresAt?: Date; // Optional expiration
}

export class ShareService {
  /**
   * Generate a cryptographically secure share token
   */
  private generateShareToken(): string {
    // Use crypto.randomBytes or nanoid for secure token generation
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Create a share link for a specific drill version
   * Requires authentication (only drill owner can create)
   */
  async createShareLink(
    input: CreateShareLinkInput
  ): Promise<DatabaseResult<ShareLink>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          data: null,
          error: new Error('User not authenticated'),
        };
      }

      // Verify drill ownership
      const { data: drill, error: drillError } = await supabase
        .from('drills')
        .select('id')
        .eq('id', input.drillId)
        .eq('user_id', user.id)
        .single();

      if (drillError || !drill) {
        return {
          data: null,
          error: new Error('Drill not found or access denied'),
        };
      }

      // Verify version exists
      const { data: version, error: versionError } = await supabase
        .from('drill_versions')
        .select('id, version_number')
        .eq('drill_id', input.drillId)
        .eq('version_number', input.versionNumber)
        .eq('user_id', user.id)
        .single();

      if (versionError || !version) {
        return {
          data: null,
          error: new Error('Version not found'),
        };
      }

      // Generate unique token
      const shareToken = this.generateShareToken();

      // Create share link
      const { data, error } = await supabase
        .from('share_links')
        .insert({
          drill_id: input.drillId,
          version_number: input.versionNumber,
          share_token: shareToken,
          created_by: user.id,
          expires_at: input.expiresAt?.toISOString() || null,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: new Error(`Failed to create share link: ${error.message}`),
        };
      }

      return {
        data: data as ShareLink,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Get share link by token (for anonymous access)
   * No authentication required
   */
  async getShareLinkByToken(
    token: string
  ): Promise<DatabaseResult<ShareLink>> {
    try {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error || !data) {
        return {
          data: null,
          error: new Error('Share link not found or invalid'),
        };
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return {
          data: null,
          error: new Error('Share link has expired'),
        };
      }

      // Update access tracking
      await supabase
        .from('share_links')
        .update({
          access_count: (data.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      return {
        data: data as ShareLink,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Get drill version via share token (anonymous access)
   */
  async getDrillVersionByShareToken(
    token: string
  ): Promise<DatabaseResult<{ drill: Drill; version: DrillVersionRecord }>> {
    try {
      // Get share link
      const shareLinkResult = await this.getShareLinkByToken(token);
      if (shareLinkResult.error || !shareLinkResult.data) {
        return {
          data: null,
          error: shareLinkResult.error || new Error('Invalid share link'),
        };
      }

      const shareLink = shareLinkResult.data;

      // Get drill record (may need to adjust RLS)
      const { data: drillRecord, error: drillError } = await supabase
        .from('drills')
        .select('*')
        .eq('id', shareLink.drill_id)
        .single();

      if (drillError || !drillRecord) {
        return {
          data: null,
          error: new Error('Drill not found'),
        };
      }

      // Get version (RLS should allow via share link)
      const { data: version, error: versionError } = await supabase
        .from('drill_versions')
        .select('*')
        .eq('drill_id', shareLink.drill_id)
        .eq('version_number', shareLink.version_number)
        .single();

      if (versionError || !version) {
        return {
          data: null,
          error: new Error('Version not found'),
        };
      }

      // Convert to Drill object (similar to DrillService.recordToDrill)
      const drill = await this.versionToDrill(drillRecord, version);

      return {
        data: {
          drill,
          version: version as DrillVersionRecord,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Convert version record to Drill (similar to DrillService.recordToDrill)
   * Handles audio URL generation for anonymous users
   */
  private async versionToDrill(
    drillRecord: DrillRecord,
    version: DrillVersionRecord
  ): Promise<Drill> {
    const drill = version.drill_data;
    drill.id = drillRecord.short_id;
    drill.metadata.createdAt = new Date(drillRecord.created_at);
    drill.metadata.modifiedAt = new Date(version.created_at);

    // Handle audio track - create public signed URL
    if (version.audio_url) {
      const isFullUrl = version.audio_url.startsWith('http://') || 
                        version.audio_url.startsWith('https://');
      
      if (isFullUrl) {
        drill.audioTrack = {
          url: version.audio_url,
          offset: drill.audioTrack?.offset || 0,
          filename: version.audio_filename || undefined,
        };
      } else {
        // Create signed URL (may need to adjust storage policy for anonymous access)
        const { data: urlData, error } = await supabase.storage
          .from('drill-audio')
          .createSignedUrl(version.audio_url, 3600);

        if (!error && urlData) {
          drill.audioTrack = {
            url: urlData.signedUrl,
            offset: drill.audioTrack?.offset || 0,
            filename: version.audio_filename || undefined,
          };
        }
      }
    }

    return drill;
  }

  /**
   * List share links for a drill (owner only)
   */
  async getShareLinksForDrill(
    drillId: string
  ): Promise<DatabaseResult<ShareLink[]>> {
    // Implementation similar to createShareLink with auth check
    // ...
  }

  /**
   * Revoke a share link (owner only)
   */
  async revokeShareLink(shareLinkId: string): Promise<DatabaseResult<void>> {
    // Implementation with auth check
    // ...
  }
}

export const shareService = new ShareService();
```

#### 2.2 Update DrillService for Anonymous Access
Add methods to `drillService.ts` that don't require authentication:

```typescript
/**
 * Get drill version by share token (no auth required)
 * This is a convenience method that delegates to ShareService
 */
async getDrillVersionByShareToken(
  token: string
): Promise<DatabaseResult<{ drill: Drill; version: DrillVersionRecord }>> {
  return shareService.getDrillVersionByShareToken(token);
}
```

### Phase 3: Frontend Routing Updates

#### 3.1 Add New Route
**File**: `src/App.tsx`

```typescript
// Add new route for viewing shared drills
<Route path="/view/:token" element={<SharedDrillViewer />} />
```

#### 3.2 Create SharedDrillViewer Component
**File**: `src/components/SharedDrillViewer/SharedDrillViewer.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDrillStore } from '../../stores/drillStore';
import { shareService } from '../../services/shareService';
import Layout from '../UI/Layout';
import { Drill } from '../../types';

export default function SharedDrillViewer() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setDrill = useDrillStore((state) => state.setDrill);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(true);

  useEffect(() => {
    const loadSharedDrill = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const result = await shareService.getDrillVersionByShareToken(token);
        
        if (result.error || !result.data) {
          setError(result.error?.message || 'Failed to load drill');
          setLoading(false);
          return;
        }

        // Set drill in store (read-only mode)
        setDrill(result.data.drill, false, false);
        setIsReadOnly(true);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drill');
        setLoading(false);
      }
    };

    loadSharedDrill();
  }, [token, setDrill]);

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-700 dark:text-gray-300">Loading shared drill...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 dark:text-red-400 mb-2">Error: {error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Read-only banner */}
      <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-center">
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          Viewing shared drill (read-only)
        </span>
      </div>
      <Layout isReadOnly={isReadOnly} />
    </>
  );
}
```

#### 3.3 Update Layout Component for Read-Only Mode
**File**: `src/components/UI/Layout.tsx`

Add `isReadOnly` prop and disable editing controls when true:
- Disable save buttons
- Disable edit controls
- Show read-only indicators
- Disable frame/horse editing

### Phase 4: UI for Creating Share Links

#### 4.1 Add Share Button to Version History
**File**: `src/components/VersionHistory/VersionHistory.tsx`

Add a "Share" button next to each version that:
1. Creates a share link via `shareService.createShareLink()`
2. Copies the share URL to clipboard
3. Shows a success message with the link

```typescript
const handleShareVersion = async (drillId: string, versionNumber: number) => {
  const result = await shareService.createShareLink({
    drillId,
    versionNumber,
  });

  if (result.error) {
    // Show error
    return;
  }

  const shareUrl = `${window.location.origin}/view/${result.data.share_token}`;
  await navigator.clipboard.writeText(shareUrl);
  // Show success toast
};
```

#### 4.2 Add Share Management UI (Optional)
Create a component to:
- List all share links for a drill
- Show access statistics
- Revoke share links
- Set expiration dates

### Phase 5: Storage Access for Anonymous Users

#### 5.1 Update Storage Policies
Supabase Storage policies need to allow anonymous access to audio files when accessed via a valid share link. This is complex because:
- Storage policies can't directly check database tables
- Need to use signed URLs (already implemented)
- Or create a proxy endpoint that validates share token and serves files

**Recommended Approach**: Continue using signed URLs, but ensure they're generated with sufficient expiration time for viewing sessions.

#### 5.2 Alternative: Proxy Endpoint
Create a serverless function (Supabase Edge Function) that:
1. Validates the share token
2. Retrieves the audio file path
3. Generates a signed URL
4. Returns the URL or proxies the file

### Phase 6: Security Considerations

#### 6.1 Token Security
- Use cryptographically secure random tokens (32+ bytes)
- Store tokens as base64url (URL-safe)
- Consider token rotation/expiration

#### 6.2 Rate Limiting
- Limit share link creation per user/drill
- Rate limit anonymous access to prevent abuse

#### 6.3 Access Logging
- Track access for audit purposes
- Monitor for suspicious patterns

#### 6.4 Content Security
- Ensure RLS policies prevent unauthorized access
- Validate all inputs
- Sanitize outputs

### Phase 7: Testing

#### 7.1 Unit Tests
- ShareService methods
- Token generation
- Access validation

#### 7.2 Integration Tests
- End-to-end share link creation and access
- Anonymous user viewing flow
- Expiration handling
- Revocation handling

#### 7.3 Security Tests
- Verify RLS policies
- Test token validation
- Test unauthorized access attempts

## Implementation Order

### Priority 1 (Core Functionality)
1. Database schema updates (share_links table)
2. RLS policy updates
3. ShareService implementation
4. SharedDrillViewer component
5. Routing updates

### Priority 2 (User Experience)
6. Share button in Version History
7. Read-only mode UI
8. Share link management UI

### Priority 3 (Polish)
9. Access statistics
10. Link expiration UI
11. Share link management dashboard

## Alternative Simplified Approach

If the full implementation is too complex initially, consider:

1. **Simpler URL Structure**: `/view/:drillId/:versionNumber` with a public access token in query params
2. **No Dedicated Table**: Add `share_token` directly to `drill_versions` table
3. **No Expiration**: Start without expiration, add later
4. **No Access Tracking**: Skip analytics initially

This reduces complexity but limits future flexibility.

## Database Migration Script

```sql
-- Create share_links table
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (drill_id, version_number) 
    REFERENCES drill_versions(drill_id, version_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_share_links_drill_version ON share_links(drill_id, version_number);

-- RLS policies (see Phase 1.2)
```

## Estimated Effort

- **Database Setup**: 2-4 hours
- **Backend Services**: 8-12 hours
- **Frontend Components**: 6-8 hours
- **UI/UX**: 4-6 hours
- **Testing**: 6-8 hours
- **Security Review**: 2-4 hours

**Total**: ~28-42 hours

## Future Enhancements

1. **Password Protection**: Add optional password to share links
2. **Access Control**: Limit access by IP, domain, or user agent
3. **Analytics Dashboard**: Detailed access statistics
4. **Bulk Sharing**: Share multiple versions at once
5. **Email Sharing**: Send share links via email
6. **Embedding**: Allow embedding shared drills in other websites
7. **Download Restrictions**: Control whether viewers can download the drill

