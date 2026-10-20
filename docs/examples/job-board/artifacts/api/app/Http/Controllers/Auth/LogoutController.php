<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class LogoutController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    /**
     * auth:sanctum has already resolved the bearer token, so it is present here.
     */
    public function __invoke(Request $request): Response
    {
        $token = $request->bearerToken();

        if ($token !== null) {
            $this->auth->logout($token);
        }

        return $this->noContent();
    }
}
