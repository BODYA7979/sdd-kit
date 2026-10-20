<?php

namespace App\Http\Controllers\Auth;

use App\DTOs\RegisterUserDTO;
use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RegisterController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = RegisterUserDTO::validateAndCreate($request->all());

        return $this->resource($this->auth->register($data)->toApiArray(), 'Registered', 201);
    }
}
