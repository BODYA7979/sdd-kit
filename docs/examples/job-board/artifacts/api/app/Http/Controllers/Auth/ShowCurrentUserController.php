<?php

namespace App\Http\Controllers\Auth;

use App\DTOs\UserDTO;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ShowCurrentUserController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->resource(UserDTO::fromModel($user)->toApiArray());
    }
}
