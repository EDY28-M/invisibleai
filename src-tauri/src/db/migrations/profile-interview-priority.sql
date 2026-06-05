-- ============================================================
-- Migration v8: Prioritize Interview Expert in the templates grid
-- ============================================================
-- Bump every existing profile by +1 to free up sort_order = 0, then
-- place "interview_meeting_expert" at sort_order = 0 so it renders as
-- the first card in the Profiles screen.

UPDATE profile_templates
SET sort_order = sort_order + 1
WHERE id != 'interview_meeting_expert';

UPDATE profile_templates
SET sort_order = 0
WHERE id = 'interview_meeting_expert';
