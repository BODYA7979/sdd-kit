<?php

namespace App\Http\Controllers\Applications;

use App\DTOs\JobApplicationDTO;
use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\User;
use App\Services\JobApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ListEmployerApplicationsController extends Controller
{
    public function __construct(private readonly JobApplicationService $applications) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewEmployerApplications', JobApplication::class);

        /** @var User $employer */
        $employer = $request->user();
        $perPage = min(max($request->integer('per_page', 20), 1), 50);

        $page = $this->applications->listForEmployer($employer->id, $perPage);

        return $this->paginated(
            $page->through(fn (JobApplicationDTO $application): array => $application->toEmployerArray()),
        );
    }
}
