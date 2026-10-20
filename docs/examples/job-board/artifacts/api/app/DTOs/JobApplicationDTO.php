<?php

namespace App\DTOs;

use App\Enums\JobPostingStatus;
use App\Models\JobApplication;
use Spatie\LaravelData\Data;

/**
 * One application with the job, company and applicant details both views need.
 * toApiArray() is the candidate's own view; toEmployerArray() is the employer's view,
 * which exposes only name, email and headline of the applicant (BR-21).
 */
final class JobApplicationDTO extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $jobId,
        public readonly string $jobTitle,
        public readonly JobPostingStatus $jobStatus,
        public readonly string $companySlug,
        public readonly string $companyName,
        public readonly string $candidateName,
        public readonly string $candidateEmail,
        public readonly ?string $candidateHeadline,
        public readonly ?string $coverLetter,
        public readonly string $submittedAt,
    ) {}

    /**
     * Expects jobPosting.company, candidate and candidateProfile to be loaded.
     */
    public static function fromModel(JobApplication $application): self
    {
        $job = $application->jobPosting;
        $company = $job->company;
        $candidate = $application->candidate;

        return new self(
            id: $application->id,
            jobId: $job->id,
            jobTitle: $job->title,
            jobStatus: $job->status,
            companySlug: $company->slug,
            companyName: $company->name,
            candidateName: $candidate->name,
            candidateEmail: $candidate->email,
            candidateHeadline: $application->candidateProfile?->headline,
            coverLetter: $application->cover_letter,
            submittedAt: (string) $application->created_at?->toIso8601ZuluString(),
        );
    }

    /**
     * @return array{id: string, job: array{id: string, title: string, company: array{slug: string, name: string}}, cover_letter: ?string, submitted_at: string}
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'job' => [
                'id' => $this->jobId,
                'title' => $this->jobTitle,
                'company' => [
                    'slug' => $this->companySlug,
                    'name' => $this->companyName,
                ],
            ],
            'cover_letter' => $this->coverLetter,
            'submitted_at' => $this->submittedAt,
        ];
    }

    /**
     * @return array{id: string, job: array{id: string, title: string, status: string}, candidate: array{name: string, email: string, headline: ?string}, cover_letter: ?string, submitted_at: string}
     */
    public function toEmployerArray(): array
    {
        return [
            'id' => $this->id,
            'job' => [
                'id' => $this->jobId,
                'title' => $this->jobTitle,
                'status' => $this->jobStatus->value,
            ],
            'candidate' => [
                'name' => $this->candidateName,
                'email' => $this->candidateEmail,
                'headline' => $this->candidateHeadline,
            ],
            'cover_letter' => $this->coverLetter,
            'submitted_at' => $this->submittedAt,
        ];
    }
}
