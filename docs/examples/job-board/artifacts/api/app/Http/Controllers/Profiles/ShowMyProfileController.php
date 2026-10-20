<?php

declare(strict_types=1);

namespace App\Http\Controllers\Profiles;

use App\Http\Controllers\Controller;
use App\Models\CandidateProfile;
use App\Services\CandidateProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShowMyProfileController extends Controller
{
    public function __construct(
        private readonly CandidateProfileService $profiles,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('manage', CandidateProfile::class);

        $profile = $this->profiles->findForUser((int) $request->user()->id);

        return $this->resource($profile->toApiArray());
    }
}
