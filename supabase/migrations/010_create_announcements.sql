-- Announcements

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) >= 3),
  body TEXT NOT NULL CHECK (length(trim(body)) >= 3),
  audience TEXT NOT NULL DEFAULT 'ALL' CHECK (audience IN ('ALL', 'ADMIN', 'SK_OFFICIAL')),
  barangay_id UUID NULL REFERENCES barangays(id),
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'ARCHIVED')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_announcements_status_created ON announcements (status, created_at DESC);
CREATE INDEX idx_announcements_barangay ON announcements (barangay_id);
CREATE INDEX idx_announcements_audience ON announcements (audience);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_admin_all
  ON announcements
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY announcements_sk_view_published
  ON announcements
  FOR SELECT
  USING (
    status = 'PUBLISHED'
    AND audience IN ('ALL', 'SK_OFFICIAL')
    AND (barangay_id IS NULL OR barangay_id = public.current_barangay_id())
    AND (expires_at IS NULL OR expires_at >= now())
  );
