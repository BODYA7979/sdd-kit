<?php

namespace App\Services;

use App\Contracts\CompanyRepositoryInterface;
use App\DTOs\CompanyDTO;
use App\Exceptions\CompanyNotFoundException;

class CompanyService
{
    public function __construct(private readonly CompanyRepositoryInterface $companies) {}

    /**
     * @throws CompanyNotFoundException
     */
    public function findBySlug(string $slug): CompanyDTO
    {
        return $this->companies->findBySlug($slug) ?? throw new CompanyNotFoundException;
    }
}
