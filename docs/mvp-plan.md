# VBER · DIY visitor visa workspace

VBER gives an adult in mainland China a free, mobile-first workspace to prepare their own Australian Visitor visa (subclass 600), Tourist stream application for a holiday or a visit to family or friends. They can start on a phone, resume on a computer, and keep their answers, original documents, English translations, and editable letters together. The applicant checks the document list in their own ImmiAccount, pays, and lodges with Home Affairs. [Tourist stream for applicants outside Australia](https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600/tourist-stream-overseas)

## Product decisions

- Ask who will pay separately from whom the applicant is visiting. A self-funded guest still needs guidance on the invitation, while a relative funding the trip introduces a separate evidence prompt. The checklist should explain why an item appears. [签小抄 checklist builder](https://visanote.cn/checklists/new) · [签证材料通 Australia checklist](https://visa.heyriver.cn/visa-requirements/australia/visitor-600-tourist/) · [Home Affairs visitor guidance](https://immi.homeaffairs.gov.au/check-twice-submit-once/visitor-visa)
- Reuse saved answers for three editable documents: an itinerary, an invitation letter, and an employment or leave letter. The applicant or signatory checks their own facts. [AI 搞定 Australia guide](https://aidone.cc/guide/australia)
- Launch on the web, including small screens and the WeChat in-app browser. Use simplified Mandarin for guidance, labels, errors, accessibility text, and Clerk screens. Preserve official English legal terms. The first release is free. OCR, machine translation, professional review, billing, and a native mini-program are deferred.

## Applicant journey

| Surface | Applicant experience |
| --- | --- |
| Home and public guide | Read the scope before sign-in. Check age, present location, and purpose. Give minors, onshore applicants, and people with another purpose relevant official guidance before collecting personal details. Link to current fees and processing times. |
| Private dashboard | Create, deliberately resume, or delete a draft. Show the last saved step, server-confirmed save time, and expiry. Confirm the supported scope when entering directly through the dashboard. |
| Guided answers | Collect passport identity details, contact information, travel dates and history, accommodation, hosts, funding, and reasons to return. 保存草稿 accepts partial answers. 保存并继续 checks the current step and directs the applicant to any field that needs correction. Preserve local edits if another device saves first. |
| Evidence checklist | Use stable item IDs and conditional prompts for self-funded holidays, self-funded guests, and trips funded by another person. Attach multiple originals, pair translations with their originals, or explain an unavailable item. Preserve earlier notes and files when the purpose or payer changes. Link to the source and show its review date for each rule. |
| Editable documents | Prefill only facts the applicant supplied. Keep edits when source answers change, flag affected drafts for review, and let the applicant preview and print or save as PDF. Identify who checks or signs each letter. |
| Review and handoff | Show missing answers, evidence, notes, templates, and links back to their sections. Offer a printable summary and individual file downloads. 前往 ImmiAccount opens the official service and leaves the VBER draft editable. After lodgement, direct applicants to official messages, further evidence requests, and their decision. [ImmiAccount](https://online.immi.gov.au/lusc/login) · [File attachment instructions](https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online/attach-documents-to-your-application) |

## Frontend and backend

Use the App Router for the public guide, protected dashboard, and step pages. Compose forms from the project's shadcn/ui primitives. Keep the next action visible on a phone, support Chinese keyboard input, associate validation messages with their fields, and announce saves. [UI guidelines](./ui.md)

Resolve the Clerk identity on the server. Start private reads in Server Components. Co-locate typed, runtime-validated Server Actions with the relevant features. Keep owner-scoped Drizzle queries under `data/`, check revision numbers on saves, and keep applicant records out of shared caches. Version migrations for drafts, applicant answers, evidence notes, document metadata, and editable template content. [Fetching policy](./data-fetching.md) · [Mutation policy](./data-mutations.md)

Store PDF, JPEG, and PNG files in the private Neon assets bucket. Reserve storage before issuing a short-lived URL. Upload to staging, check the actual bytes, and publish exactly the verified content. Use retry-safe identifiers, bounded file and draft quotas, and short-lived owner-authorized downloads. Keep readable filenames in metadata and opaque keys in storage.

Show the retention terms before uploading. Deliberately resuming or successfully editing a draft renews its **90-day inactivity period**. At expiry or manual deletion, block new access immediately. Schedule a Neon Function to remove expired drafts, abandoned uploads and stored files, retrying failed cleanup. Record operational counts and failure categories without applicant details, filenames, signed URLs, or document content.

## Milestones and release checks

1. **Save and resume one complete step.** Ship the Mandarin home and public scope check, localized sign-in, migration, dashboard, and identity form. Save a partial identity step on a phone and resume it on desktop. Exercise stale revisions and isolation between accounts.
2. **Prepare the evidence and letters.** Deliver the trip and funding questions, adaptive checklist, notes, and three editable templates. Exercise the three funding scenarios, change the payer after saving evidence notes, then edit and print each template with Chinese names and addresses.
3. **Handle private files and retention.** Exercise paired translations, retry after interruption, incorrect file types and sizes, quota boundaries, and cross-account download denial. Exercise renewal, expiry, manual deletion, and a failed cleanup followed by a successful retry.
4. **Review and hand off.** Find and correct a missing answer, print the review, retrieve a file, open ImmiAccount, and resume the same draft. Exercise keyboard navigation, light and dark themes, and phone and desktop widths. Run lint, a production build, migration and integration tests on a synthetic database, and the live Neon verifier. Treat the AI Gateway check separately from database and file storage. Test sign-in, verification email, upload, retry, download, and handoff on a mainland mobile connection and inside WeChat before declaring mainland compatibility.
