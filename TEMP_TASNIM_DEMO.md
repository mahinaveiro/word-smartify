# Temporary Tasnim congratulations preview

This temporary demo lets only the Word Smartify owner account (`f35d5693-11e6-470f-a498-28ce07161c26`) see Tasnim’s permanent Community Contributor congratulations modal once at startup.

The preview is intentionally local to the owner’s browser. It does not change Tasnim’s account, does not create or acknowledge a real badge award, and does not change the normal recipient flow for anyone else. The preview is tracked by `localStorage` under `word-smartify:owner-tasnim-demo-seen:<owner-id>`.

To test it after deployment, sign in as Mahin, open the app, complete or dismiss any earlier startup prompt if one appears, and the Tasnim contributor reward should appear once. Dismissing it marks only the local preview as seen.

To remove this temporary behavior after testing, delete the owner-demo constants and logic from `features/setup/post-setup-prompts.tsx`, remove the `skipAcknowledgement` prop and conditional in `features/badges/badge-congratulations-modal.tsx`, restore `StudyGcPrompt` to its original always-enabled behavior, and delete this file. Also remove the localStorage key if desired. The permanent badge system and Tasnim/Ashik award records should remain unchanged.
