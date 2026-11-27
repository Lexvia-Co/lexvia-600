# VBER homepage redesign plan

Give first-time visitors a clear route to the public guide and returning applicants a direct route to their drafts. Use a single Australian travel photograph to establish the destination, then show what a visitor can actually prepare in VBER.

## What to take from 11visa

On desktop, 11visa places a short Chinese headline and two large actions over a darkened aerial scene. Below the banner, a compact service strip and image-led listings make the page easy to scan. Its destination search, product prices and booking counts serve a multi-country marketplace. VBER serves one destination and one visa stream, so the most useful choice is whether the visitor is starting or resuming. [11visa homepage](https://www.11visa.com/)

VBER already has the right entry points. Its current hero divides attention between the buttons on the left and a preparation checklist on the right. Move the preparation details below the first screen so visitors can recognise the destination, understand the service and choose their next action in one glance.

## Proposed page, from top to bottom

1. **Shared header.** Use the existing VBER wordmark, guide, drafts and Clerk account controls on their solid header surface. This gives returning visitors familiar navigation and keeps keyboard focus visible against a predictable background.
2. **Australian harbour hero.** Use one original or licensed, locally hosted photograph. Frame Sydney Harbour from a ferry or the foreshore, with the landmark to one side and open water behind the central headline. Use a navy overlay with white text and give the hero its own semantic foreground, surface and focus colours. Keep the heading and buttons as HTML. Use a shorter crop on phones, with the primary action first and both actions visible before scrolling on a typical phone at default text size.
3. **Preparation strip.** Rework the existing three-column section into a short ordered sequence: **填写行程** — 记录出行日期、住宿和费用安排。 **整理材料** — 按清单归集证明，并把原件和英文译件放在一起。 **核对并递交** — 打印准备摘要，再到自己的 ImmiAccount 核对、缴费并递交。 Lay out the steps horizontally on wide screens and vertically on phones.
4. **One workspace example.** Under **材料整理示例**, show a static, clearly labelled example of an invitation letter alongside its English translation. Use two text rows with example filenames, styled like the real evidence list. This explains what pairing files means before someone signs in. Close with the existing Home Affairs materials link for applicants who want the official guidance.

### Proposed first-screen copy

| Element | Text or destination |
| --- | --- |
| Visa name | Visitor visa (subclass 600) · Tourist stream |
| Heading | 准备你的澳大利亚访客签证 |
| Supporting line | 计划赴澳旅游或探亲？用中文整理行程、证明材料和英文文书，再到 ImmiAccount 自行递交。 |
| Primary button | 查看准备指南 → `/guide`, where visitors can check whether the guide fits their situation |
| Secondary button | 继续我的草稿 → `/applications`, with sign-in for signed-out visitors |

## Implementation and acceptance

- Compose the homepage in `app/page.tsx` as a Server Component. Use the installed shadcn/ui `Button asChild` with Next.js links, and retain `prefetch={false}` for the protected dashboard. Use semantic headings and a list for the process strip. Keep the shared skip link and the existing Chinese system font stack. [UI policy](ui.md)
- Put the photo in `public/` and serve it with `next/image` and responsive sizes. Reserve its space before it loads. Treat the photo as decorative with empty alt text. Prioritize it if it is the largest visible element and use a solid navy fallback that keeps all actions readable.
- Scope the new layout and colour tokens to the homepage in `app/globals.css`. The public guide also uses `.public-shell`, `.intro-copy` and `.stream-label`. Check the guide after editing shared style groups.
- Verify the homepage at 320, 390 and 1440 pixels and at 200% zoom in light and dark mode. Check the mobile crop, text contrast over the brightest part of the photo, visible keyboard focus, reading order and button wrapping. Block the photo once and confirm the heading and links still work. Follow both links signed out, then confirm a signed-in applicant reaches their dashboard. Run lint and the production build.
