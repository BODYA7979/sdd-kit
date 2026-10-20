# Decisions — spec-HIRE-4-company-reviews

Decisions made while writing the spec. Each one names the alternative we turned down and why.

## D1 — The rating summary goes in the reviews list meta, not on company show

- **Decision**: `GET /api/v1/companies/{slug}/reviews` returns `meta.average_rating` next to the pagination meta. `GET /api/v1/companies/{slug}` gets no review fields.
- **Alternative**: add `average_rating` and `review_count` to the Company payload.
- **Why**: the company show payload is a published contract. `getCompany()` in `web/lib/api/jobs.ts` and the web `Company` type mirror it field for field, and MNC-1 freezes it. Clients that want the summary already call the reviews list, and its `meta.total` is the review count.
- **Consequence**: a page that shows the rating makes one extra request. That is acceptable at Hireboard's size.

## D2 — Moderation state is a status column on company_reviews

- **Decision**: `status` (`pending | approved | rejected`) plus `moderated_by`, `moderated_at` and `rejection_reason` on `company_reviews`.
- **Alternative**: a separate `review_moderations` table holding one row per decision.
- **Why**: v1 has exactly one decision per review and no history (BR-44: moderation is final). A second table would add a join to every public read and buy nothing until edit or resubmit exists.
- **Revisit when**: reviews become editable or resubmittable, because then a decision history is needed.

## D3 — Unique index plus a service pre-check for one review per company

- **Decision**: `UNIQUE (company_id, candidate_id)` in the migration, and `CompanyReviewService::submit()` checks `existsForCandidate()` first and throws `ReviewAlreadyExistsException` (409 `review_already_exists`).
- **Alternative**: rely on the index alone and translate the database error.
- **Why**: the pre-check gives the common case a clear domain error without touching the database error path. The index is still the guarantee. `CompanyReviewRepository::create()` also maps a `UniqueConstraintViolationException` to the same exception, so a double-click race answers 409 instead of 500.
