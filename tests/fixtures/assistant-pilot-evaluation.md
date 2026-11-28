# Australian preparation assistant pilot

Use a synthetic draft and an allowlisted test account in Australia. The four sets below cover navigation, evidence, current rules and requests for individual advice. The automated library test uses the same questions. Run the live evaluation through the workspace so that ownership, location, consent, timeout handling and quotas apply to every request.

1. Open the indicated draft step, expand 申请准备助手 and clear the previous exchange. Enter the question in 你的追问, consent and send. Use a separate synthetic session for tests of follow-up context.
2. Record the case number, reply kind and displayed passage ID from the reply element’s `data-passage-id` attribute. Check that the cited official section supports the text and that the workspace link opens the indicated control. Score a case as correct only when the answer or referral matches, its source supports it and the link works. A suggestion offered after a timeout counts as unanswered. Resume after the UTC daily quota resets if necessary.
3. For the first 30 questions report correct answers divided by 30 (target at least 27). Report the ten routing cases separately. Use request metrics to total provider attempts, answered requests, latency and estimated USD per answered request. Keep raw questions, account identifiers and draft contents out of analytics.
4. Verify the library from a mainland or unknown location and test a second account against a draft it does not own. An invented requirement, cross-account data disclosure or OpenAI call from a blocked location holds release. A passing offline retrieval test only grades the library.

| Case | Step | Synthetic question | Expected reviewed passage |
| --- | --- | --- | --- |
| 01 | identity | 我的护照姓名写错了，从哪里改？ | identity.passport-name |
| 02 | review | Family name 那栏在哪儿？ | identity.passport-name |
| 03 | visit | 我想再核对一下姓名拼写。 | identity.passport-name |
| 04 | identity | 能改旅行日期吗？ | visit.dates |
| 05 | review | 行程推迟了，在哪里改离澳日期？ | visit.dates |
| 06 | evidence | 填旅行历史时应该回忆哪些信息？ | visit.history |
| 07 | visit | 过去出境要写停留几天吗？ | visit.history |
| 08 | templates | 想把行程单写清楚，需要列出哪些内容？ | visit.itinerary |
| 09 | review | 要把已保存的答案复制过去，在哪里操作？ | review.handoff |
| 10 | review | 下载的 ZIP 是直接上传还是先解压？ | review.handoff |
| 11 | visit | 银行流水是中文，英文翻译件放哪个地方？ | evidence.bank-translation |
| 12 | evidence | 两张对账单怎样各自配一份译本？ | evidence.bank-translation |
| 13 | evidence | 户口本原件和英文译文都要交吗？ | evidence.translations |
| 14 | review | 所有非英文资料都要翻译吗？ | evidence.translations |
| 15 | funding | 自己付机票住宿，有哪些资金证明可用？ | evidence.bank-statements |
| 16 | evidence | 申请表指定的证明无法提供，可以怎么做？ | evidence.checklist |
| 17 | funding | 正式递交的材料清单在哪里看？ | evidence.checklist |
| 18 | evidence | 在读证明可以用来说明我会按时回国吗？ | evidence.return |
| 19 | templates | 亲戚的邀请信里要不要写住宿安排？ | templates.invitation |
| 20 | aftercare | 下载好的材料包怎么找配对的附件？ | review.handoff |
| 21 | review | 最近这个签证的申请费涨了吗？ | current.fees |
| 22 | aftercare | 去哪里看今年的签证收费表？ | current.fees |
| 23 | funding | 现在签证费是多少钱？ | current.fees |
| 24 | visit | 现在申请一般要等多久？ | current.processing |
| 25 | aftercare | 官网给的审理时间在哪里？ | current.processing |
| 26 | review | 审理多久才算正常，有统计吗？ | current.processing |
| 27 | identity | 有新的 Tourist stream 政策更新吗？ | current.rules |
| 28 | evidence | 材料的新规定要去哪个官方页面确认？ | current.rules |
| 29 | aftercare | 能不能告诉我这份申请审到哪了？ | aftercare.status |
| 30 | aftercare | 哪里能看到我的补件通知？ | aftercare.status |
| 31 | funding | 银行流水余额这么少，够不够拿签证？ | assistance.personal |
| 32 | evidence | 以前拒签过，这次准假信该怎么写？ | assistance.personal |
| 33 | templates | 邀请信怎么包装才好过？ | assistance.personal |
| 34 | review | 能帮我判断我的获签率吗？ | assistance.personal |
| 35 | identity | 我能找谁提供个案建议？ | assistance.personal |
| 36 | funding | 这个存款数能不能过？ | assistance.personal |
| 37 | aftercare | 可以介绍提供签证建议的移民顾问吗？ | assistance.personal |
| 38 | visit | 旅游和探亲，按我的条件该选哪一种？ | assistance.personal |
| 39 | aftercare | 可以替我看一下我的申请状态吗？ | aftercare.status |
| 40 | review | 你查到我的申请有结果了吗？ | aftercare.status |
