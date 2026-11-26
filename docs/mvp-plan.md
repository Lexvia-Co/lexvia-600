# Lexvia 600 MVP plan

Build a DIY workspace where an applicant can prepare an Australian Visitor visa (subclass 600) application, pause, and return with their answers and supporting files intact. Start with one adult preparing their own Tourist stream application from outside Australia for a holiday or to visit family or friends. The applicant lodges, pays, and receives the decision through Home Affairs. [Tourist stream guide](https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600/tourist-stream-overseas?bk=HowTo)

## Applicant journey

| Step | What the applicant can do |
| --- | --- |
| 1. Check the guide fits | Read the guide before signing in. Confirm age group, current location, and purpose of travel. Explain the offshore location rule at lodgement and decision. Give onshore applicants, children, and people seeking another stream a direct link to the relevant official guidance before asking for personal information. |
| 2. Start a private draft | Sign in with Clerk. Save legal names as shown on the passport, date of birth, citizenship, country of residence, contact details, and passport expiry. A dashboard shows the last saved step and a Resume button. |
| 3. Describe the visit | Record purpose, intended dates, places to visit, accommodation, and relevant travel history. Ask about the host when visiting someone. Ask who will cover expenses and what work, study, family, or other commitments will bring the applicant home. |
| 4. Gather evidence | Show a checklist with passport identity pages, travel plans, evidence of funds, and reasons to return. If visiting a host, include an invitation. If the host is paying, include evidence of their support. Prompt for an original and an English translation for non-English documents. Allow multiple files per item and a note explaining unavailable evidence. |
| 5. Review and lodge | Show saved answers, missing details, files, and notes with an Edit link for each section. Offer a printable summary and individual file downloads. Open ImmiAccount so the applicant can compare their official checklist, enter answers, attach files, pay, and submit. Opening the link leaves the local draft editable. |
| 6. After lodgement | Keep a short guide to checking ImmiAccount messages, responding to requests for evidence, health checks or biometrics when requested, and reading the decision. Let the applicant delete their saved draft and files. |

Home Affairs gives examples of evidence and asks applicants to follow the checklist in their own application. Label examples accordingly. Keep the guide and checklist rules in a version-controlled content file with official links and a last-reviewed date. Link to live fee and processing-time information from the stream page. [Visitor application guidance](https://immi.homeaffairs.gov.au/check-twice-submit-once/visitor-visa) · [Attachment instructions](https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online/attach-documents-to-your-application) · [ImmiAccount](https://online.immi.gov.au/lusc/login)

## Changes to the repository

| Area | Existing code | Planned change |
| --- | --- | --- |
| Pages and forms | `app/page.tsx` serves the public homepage. `app/layout.tsx` supplies Clerk. | Add a public `/guide` and protected `/applications` and `/applications/[id]/[step]` pages. Use labelled fields, keyboard-accessible navigation, inline errors, and separate Save draft and Continue actions. Allow partial saves and show when the server confirms them. |
| Authentication | `proxy.ts` initializes Clerk. Neon diagnostics run from the command line. | Protect workspace routes. Resolve the Clerk user ID server-side and check application ownership on every read, save, upload, download, and delete. Keep personal data out of shared Next.js caches, logs, and analytics. |
| Applicant data | `src/db/schema.ts` defines the demo users and Realtime probe tables. The CLI uses Drizzle helpers in `data/`. | Add application tables to the schema and versioned migrations. Fetch data in Server Components and put all database queries in server-only Drizzle helpers under `data/`. Test each migration against an existing database. |
| Uploaded files | `neon.ts` declares the private `assets` bucket. `lib/neon/services.mjs` demonstrates signed object operations. | Keep file contents in the private bucket and their metadata in Postgres. Render short-lived download links in a Server Component after checking ownership. Use authenticated Server Actions for uploads and deletions. Validate file type from its contents and enforce file-size and per-draft limits. Start with PDF, JPEG, and PNG. |

### Data model and file lifecycle

- **`applications`** stores a draft ID, Clerk owner ID, guide version, last visited step, timestamps, and a revision number to detect conflicting saves.
- **`applicant_details`** stores one applicant per draft, with typed identity and contact fields and validated sections for travel, hosts, funding, and reasons to return. Only collect fields the guide uses. The applicant enters ImmiAccount credentials and payment details on the government site.
- **`evidence_items`** stores the application ID, checklist category, and applicant notes. **`documents`** links each original or translation to its evidence item and stores its opaque object key, display filename, verified type, size, and upload state.
- Create a pending file record before upload and mark it available after validation and storage succeed. Retry failed cleanup for abandoned uploads and deleted drafts. Serve downloads only after an ownership check. Explain storage, deletion, and the retention period before the first upload. Set the retention period and verify cleanup before accepting real documents.

## Build order and acceptance

1. **Deliver one complete saved step.** Build the public guide, sign-in, migrations, dashboard, and applicant-details form. A tester can save a partial draft, sign out, and resume it on another device. A second account cannot open or change it.
2. **Complete the guided questions and checklist.** A self-funded holiday and a host-funded family visit produce different evidence prompts. Editing who pays updates the list and preserves any files already attached. Returning to a step preserves saved answers.
3. **Add private documents.** A tester can upload, download, and remove an original and its translation. Verify rejection of unsupported or oversized files, cross-account access denial, and recovery from interrupted uploads and deletions using synthetic documents.
4. **Finish review and handoff.** A tester can find a missing item, correct it, print the summary, retrieve a file, and open the official application. Verify keyboard use and mobile and desktop layouts in light and dark mode. Run lint, the production build, migration tests, and the live Neon verification script. Track the previously observed AI Gateway paid-plan restriction separately from the Postgres and file-storage checks the MVP uses.
