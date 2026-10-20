Using the /sdd routing rules (load the sdd skill if it is available), classify each request below into exactly one route: trivial, bug, decision, shipped, new app, or feature. The ticket text is included in full, so do not look up a tracker or ask me to paste anything. Do not launch any workflow, write any file, or ask me to confirm — this is a dry run. Answer with one line per request: `<number>: <route> — <one-line reason>`.

Context: Hireboard is a small job board with a Laravel 12 API repo and a Next.js 15 frontend repo. Visitors search open jobs, candidates keep a profile and apply, employers see applications to their jobs, and admins moderate company reviews.

1. HIRE-9: Closed job postings still open by direct link. As a guest, opening /jobs/<id> of the closed posting "Legacy PHP Maintainer" renders the job detail with an Apply button. Expected: the not-found page (API 404 job_not_found).
2. HIRE-6: Candidates who have a profile can apply to an open job with an optional cover letter, once per job. Candidates see their applications; employers see the applications to their own company's jobs.
3. HIRE-2: Before we build login, decide how the Next.js frontend authenticates against the Laravel API: Sanctum SPA cookies, Sanctum tokens held by the Next.js server in an HttpOnly cookie, Passport with PKCE, or Auth.js wrapping Sanctum.
4. HIRE-10: The public browse journey (job search, job detail, company careers page) is live. We need a traceable QA plan plus user and developer docs for it. No code changes.
5. Start a new admin analytics service for Hireboard in an empty repository: a small API that reports postings and applications per week for the admin team.
6. HIRE-8: On job cards, format the existing salary as "€60,000 – €80,000 a year" with Intl.NumberFormat and hide it when the posting has no salary. One component, display only.
