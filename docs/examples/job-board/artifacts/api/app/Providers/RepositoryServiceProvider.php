<?php

namespace App\Providers;

use App\Contracts\CandidateProfileRepositoryInterface;
use App\Contracts\CompanyRepositoryInterface;
use App\Contracts\CompanyReviewRepositoryInterface;
use App\Contracts\JobApplicationRepositoryInterface;
use App\Contracts\JobPostingRepositoryInterface;
use App\Contracts\UserRepositoryInterface;
use App\Repositories\CandidateProfileRepository;
use App\Repositories\CompanyRepository;
use App\Repositories\CompanyReviewRepository;
use App\Repositories\JobApplicationRepository;
use App\Repositories\JobPostingRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        JobPostingRepositoryInterface::class => JobPostingRepository::class,
        CompanyRepositoryInterface::class => CompanyRepository::class,
        UserRepositoryInterface::class => UserRepository::class,
        CompanyReviewRepositoryInterface::class => CompanyReviewRepository::class,
        CandidateProfileRepositoryInterface::class => CandidateProfileRepository::class,
        JobApplicationRepositoryInterface::class => JobApplicationRepository::class,
    ];
}
