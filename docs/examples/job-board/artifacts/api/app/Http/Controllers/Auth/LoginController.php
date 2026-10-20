<?php

namespace App\Http\Controllers\Auth;

use App\DTOs\LoginDTO;
use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LoginController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = LoginDTO::validateAndCreate($request->all());

        return $this->resource($this->auth->login($data)->toApiArray(), 'Signed in');
    }
}
