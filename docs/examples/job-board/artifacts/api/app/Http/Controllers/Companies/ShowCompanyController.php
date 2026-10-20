<?php

namespace App\Http\Controllers\Companies;

use App\Http\Controllers\Controller;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;

final class ShowCompanyController extends Controller
{
    public function __construct(private readonly CompanyService $companies) {}

    public function __invoke(string $slug): JsonResponse
    {
        return $this->resource($this->companies->findBySlug($slug)->toApiArray());
    }
}
