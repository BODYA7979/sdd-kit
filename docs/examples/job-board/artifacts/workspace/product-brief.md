# Hireboard product brief

Owner: Maya Chen (product). Status: draft business rules, to be validated by Maya Chen before
they move to `api/docs/context/business-rules.md`.

## Problem

Small companies hire a few people a year. Big job boards bury them, charge per posting and
fill their inboxes with low-effort applications. Candidates, in turn, can't tell a good
employer from a bad one before they apply.

Hireboard is a small, focused job board: open postings are easy to search, every company has
a careers page, candidates apply with one profile, and company reviews are moderated so the
ratings can be trusted.

## Roles

| Role | Who | Can |
|------|-----|-----|
| Visitor | Anyone, not signed in | Search open postings with filters, open a posting, view a company's careers page and its approved reviews |
| `candidate` | Job seeker, self-registered | Everything a visitor can, plus keep a private profile, apply to open postings, see their own applications, review a company once |
| `employer` | Hiring manager, self-registered together with their company | Everything a visitor can, plus see applications to their own company's postings |
| `admin` | Hireboard staff, seeded only | Approve or reject company reviews |

## MVP scope

1. **Job search.** Keyword, location, remote, employment type and company filters over open
   postings, newest first, paginated. Job detail shows the hiring company.
2. **Careers pages.** A public page per company: name, location, website, description, open
   jobs and the approved-review rating.
3. **Accounts.** Candidate and employer registration, login, logout. Employer registration
   creates the company.
4. **Candidate profiles.** Headline, location, bio, skills, years of experience, open to work.
5. **Applications.** A candidate applies to an open posting with an optional cover letter.
   Candidates see their applications; employers see applications to their postings.
6. **Moderated reviews.** Candidates rate and review companies; admins approve or reject
   each review before it is public.

## Non-goals (v1)

- Payments, paid postings, invoices.
- Messaging between candidates and employers.
- Email verification, password reset emails, notifications of any kind.
- Employers creating, publishing or closing postings in the UI. Postings are seeded until
  HIRE-11.
- CV/file uploads, application status workflow (shortlist, reject), saved searches.

## Business rules (draft)

IDs are stable: specs cite them, and gaps are numbered so related rules stay together.

### Accounts

- **BR-01** Self-registration roles are `candidate` or `employer`. Requesting `admin` returns 422.
- **BR-02** Employer registration creates exactly one company owned by that employer. The slug
  is `Str::slug(company_name)`, with `-2`, `-3` ... appended when taken.
- **BR-03** Emails are unique, compared and stored lowercase.
- **BR-04** API tokens expire after 7 days. Logout revokes the current token.

### Job postings

- **BR-10** Only `open` postings appear in search and detail. Draft and closed postings are
  never public (404 `job_not_found`).
- **BR-11** Search returns newest published first. `per_page` is 1-50, default 20.
- **BR-12** Salary is optional, annual, in whole currency units with an ISO currency. When
  present, `salary_min <= salary_max`.

### Candidate profiles

- **BR-20** One profile per candidate. Only candidates have profiles.
- **BR-21** A profile is private to its owner. Employers see only name, email and headline,
  and only through applications to their own jobs.

### Applications

- **BR-30** A candidate needs a profile before applying (422 `profile_required`).
- **BR-31** Only open postings accept applications (422 `job_not_open`).
- **BR-32** One application per candidate per posting (409 `already_applied`), also under a
  concurrent duplicate submit.
- **BR-33** Employers see applications only for their own company's postings, including
  closed ones.

### Company reviews

- **BR-40** Only candidates can review a company. Each candidate gets one review per company,
  whatever its status (409 `review_already_exists`).
- **BR-41** New reviews are pending. Only admins approve or reject them. Rejecting requires a
  reason of 5-255 characters.
- **BR-42** Only approved reviews are public. The author is always shown as
  "Verified candidate"; admins see the candidate's name.
- **BR-43** Company rating is the mean of approved ratings, rounded half-up to 1 decimal, or
  null when there are none.
- **BR-44** Moderation is final in v1: no edit or resubmission after a decision. Source: the
  HIRE-4 clarity gate (accepted assumption, confirmed by Maya Chen).

## Open questions for Maya Chen

- Should a candidate have applied to a company before reviewing it? (Proposed: no for v1.)
- Token lifetime: is 7 days right? Confirm with the auth decision (HIRE-2).

## Success for the MVP

- A visitor finds a relevant open posting in under a minute with filters.
- A candidate goes from registration to a submitted application in one sitting.
- No unmoderated review and no candidate identity is ever visible publicly.
