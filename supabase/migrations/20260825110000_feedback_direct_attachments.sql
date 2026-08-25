alter table public.feedback_submissions
  add column if not exists attachment_filename text,
  add column if not exists attachment_content_type text,
  add column if not exists attachment_size integer;

alter table public.feedback_submissions
  add constraint feedback_submissions_attachment_filename_length_check
    check (attachment_filename is null or char_length(attachment_filename) between 1 and 180),
  add constraint feedback_submissions_attachment_content_type_check
    check (attachment_content_type is null or attachment_content_type in ('image/jpeg', 'image/png', 'image/webp')),
  add constraint feedback_submissions_attachment_size_check
    check (attachment_size is null or attachment_size between 1 and 5242880),
  add constraint feedback_submissions_attachment_metadata_check
    check (
      (attachment_filename is null and attachment_content_type is null and attachment_size is null)
      or (attachment_filename is not null and attachment_content_type is not null and attachment_size is not null)
    );
