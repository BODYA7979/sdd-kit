<?php

namespace App\Contracts;

use App\DTOs\CompanyDTO;

interface CompanyRepositoryInterface
{
    /**
     * Includes the open job count of the company.
     */
    public function findBySlug(string $slug): ?CompanyDTO;

    /**
     * Creates the company an employer registers with (BR-02). The slug comes
     * from the name, with -2, -3 ... appended while it is taken.
     */
    public function createForOwner(int $ownerId, string $name): CompanyDTO;

    public function findByOwnerId(int $ownerId): ?CompanyDTO;
}
