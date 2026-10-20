<?php

namespace App\Http\Controllers\Applications;

use App\DTOs\SubmitApplicationDTO;
use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\User;
use App\Services\JobApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SubmitApplicationController extends Controller
{
    public function __construct(private readonly JobApplicationService $applications) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        $this->authorize('create', JobApplication::class);

        /** @var User $candidate */
        $candidate = $request->user();
        $data = SubmitApplicationDTO::validateAndCreate($request->only('cover_letter'));

        $application = $this->applications->submit($id, $candidate->id, $data);

        return $this->resource($application->toApiArray(), 'Application submitted.', 201);
    }
}
