<?php

declare(strict_types=1);

namespace App\Http\Controllers\Profiles;

use App\DTOs\UpsertCandidateProfileDTO;
use App\Http\Controllers\Controller;
use App\Models\CandidateProfile;
use App\Services\CandidateProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UpsertMyProfileController extends Controller
{
    public function __construct(
        private readonly CandidateProfileService $profiles,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('manage', CandidateProfile::class);

        $data = UpsertCandidateProfileDTO::validateAndCreate($request->all());

        $profile = $this->profiles->upsert((int) $request->user()->id, $data);

        return $this->resource($profile->toApiArray(), 'Profile saved');
    }
}
