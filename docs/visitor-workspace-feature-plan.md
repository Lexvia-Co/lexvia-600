# VBER’s next three features

Product proposal · 28 November 2026

Ship document checks first, a bilingual ImmiAccount handoff second, and a Mandarin OpenAI chatbot as a limited pilot. The first two help mainland applicants finish the job they came to do. The chatbot has a different release constraint. Mainland China is absent from OpenAI’s supported list, and its policy covers offering access to end users. Use the same reviewed Mandarin answer library for searchable help in mainland China. [OpenAI supported locations](https://help.openai.com/en/articles/7947663-chatgpt-and-openai-api-supported-countries-and-territories)

## What comparable apps offer

| Product | Published feature | What it suggests for VBER |
| --- | --- | --- |
| 兔子签 · direct competitor | Its Mandarin subclass 600 workflow prepares documents and transfers answers into the official form through a browser extension. [Australian visa offering](https://tuziqian.com/) | Applicants still have work to do after a draft is complete. Make their reviewed answers easy to transfer on a phone or desktop. |
| Visafold · Australian applicant workspace | Lists subclass 600 support, document ZIP export and private document storage. [Product and FAQ](https://visafold.com.au/) | Give applicants a usable local copy of the originals and translations they have already organised. |
| Visarun · travel-agency platform | Describes an in-form visa assistant and checks on uploaded documents. [Product FAQ](https://visarun.ai/faq) | Offer help on the step where the question arises. Start checks with problems VBER can reliably detect from the file or its metadata. |

These are vendors’ published descriptions. The time savings and success measures below are hypotheses to test with VBER applicants.

## 1. Check files before lodgement · 材料检查

VBER already organises evidence, links translations to originals, and checks files against its own 10 MiB storage limit. An 8 MB bank statement can pass that check and still exceed the 5 MB limit Home Affairs lists for ordinary documents. Home Affairs also has a separate size range for digital photographs and excludes secured or encrypted PDFs. [VBER storage policy](../lib/workspace/storage-policy.ts) · [Home Affairs attachment rules](https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online/attach-documents-to-your-application)

Add a per-file result in the evidence step and carry unresolved issues into review. Check the applicable size rule and PDF protection. Distinguish a scanned page from a digital portrait by its intended use. Let applicants identify the original’s language and flag a missing English translation when applicable. Older originals start with language unknown. Each finding links to the exact file and gives one action, such as adding its translation or choosing a smaller copy. Preserve the uploaded original. [Home Affairs visitor guidance](https://immi.homeaffairs.gov.au/check-twice-submit-once/visitor-visa)

**Release test.** Use fixtures for an oversized ordinary document, an encrypted PDF, an English document, and two Chinese originals with only one translation between them. Each warning must identify the correct file. An unreadable file or unconfirmed language must display an unresolved status.

## 2. Carry reviewed answers and files into ImmiAccount · 递交材料包

Extend the printable review with a bilingual handoff. Start with family name, given names, travel dates and other fields that map reliably. Show the English field label beside its Mandarin explanation, the exact saved value and a copy button. Preserve passport spelling. For a free-text answer written in Mandarin, let the applicant review or supply the English wording before offering it for transfer. Leave missing values visibly blank. Reuse VBER’s existing copy feedback and selectable-text fallback. [Current review](../components/workspace/workspace-review.tsx) · [Existing copy interaction](../components/workspace/template-editor.tsx)

Offer one download of the applicant’s selected files, plus a bilingual index that pairs each original with its translations. A shared number such as `03-original.pdf` and `03-translation-1.pdf` keeps the pair together after extraction. Generate the ZIP on demand from the signed-in owner’s files. The applicant extracts it, signs into ImmiAccount and attaches the requested files individually. Home Affairs recommends keeping copies because applicants cannot retrieve their supporting documents from ImmiAccount after uploading. [Home Affairs attachment instructions](https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online/attach-documents-to-your-application)

**Release test.** Have five Mandarin speakers use a synthetic draft to copy a passport name and two dates into a mock form, then locate an original and its translation. Compare time and transcription errors with today’s print-and-download workflow. Verify duplicate filenames, an interrupted export, a full 100 MiB draft, and access from a second account.

For the five-person comparison, open the [local mock form](../tests/fixtures/handoff-form.html) in a separate tab. Prepare two synthetic drafts with different names, dates and document pairs. Have each participant use the printable summary and individual downloads on one draft and the bilingual handoff on the other. Alternate the starting workflow between participants. Record time, exact name and date mismatches, incorrect file pairings, and whether anyone needed help. The release threshold is four of five completing the handoff unaided and every pair matching the index.

## 3. Answer questions inside the draft · 申请准备助手

Start with questions such as “银行流水的英文译本应该放在哪里？” Answer in simplified Chinese, cite the reviewed Home Affairs passage for any visa claim, and link to the relevant VBER control. Send case-specific strategy questions to the official page on qualified assistance. Direct status questions to ImmiAccount. The Home Affairs Digital Assistant uses similar boundaries for public information and case enquiries. [Home Affairs Digital Assistant](https://immi.homeaffairs.gov.au/help-support/tools/digital-assistant) · [Who can help with an application](https://immi.homeaffairs.gov.au/help-support/who-can-help-with-your-application/overview) · [OpenAI usage policies](https://openai.com/policies/usage-policies/)

Build a small library of reviewed answers with a passage ID, official URL, review date and workspace step. Make it searchable without a model call. For the pilot, a signed-in user in a verified supported location can ask a follow-up. A typed Server Action checks access and quotas, then calls the OpenAI Responses API with a server-only key, the current step, a redacted question and the relevant passages. Display citations resolved from known passage IDs. If coverage is insufficient or the API times out, return the source and the closest reviewed questions. [OpenAI developer quickstart](https://developers.openai.com/api/docs/quickstart)

Keep conversation history in the current session and exclude uploaded files, draft identity fields and raw messages from analytics. Use `store: false` and disclose that default OpenAI abuse-monitoring logs may retain content for up to 30 days, subject to exceptions. Gate each request by current location. Mainland and unknown locations use the searchable library. If live chat for mainland applicants is central to the product, provider selection is a separate decision. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) · [OpenAI access policy](https://help.openai.com/en/articles/9131992-chatgpt-and-api-services-in-unsupported-countries-and-territories)

**Release test.** Start with an internal Australian pilot using synthetic drafts. Grade 40 Mandarin questions covering navigation, evidence, changing rules and requests for personal advice. Target at least 90% correct, source-supported answers on the answerable set. Any invented requirement, cross-account disclosure, or provider call from a blocked or unknown location holds the pilot. Record counts, latency and cost per answered question to inform expansion.

Use the [40 pilot questions and scoring instructions](../tests/fixtures/assistant-pilot-evaluation.md) for the live evaluation.

## Delivery estimate

Assume one full-stack engineer and part-time access to a Mandarin-speaking content reviewer. These are planning estimates for a pilot.

| Timing | Deliverable | Decision at the end |
| --- | --- | --- |
| Week 1 | Document checks in evidence and review. Verify attachment rules and secure-PDF detection against fixtures. | Release when applicants can identify and resolve each seeded issue. |
| Weeks 2–3 | Bilingual transfer view, selected-file export and usability sessions. Start collecting common questions for the assistant. | Release when at least four of five testers finish the transfer unaided and every exported pair matches its index. |
| Weeks 4–5 | Searchable Mandarin library for all applicants. OpenAI integration and evaluation in the supported-location pilot. | Keep live chat limited until it passes the quality and access checks and its measured cost fits the product budget. |
