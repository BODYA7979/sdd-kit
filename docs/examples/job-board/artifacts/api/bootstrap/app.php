<?php

use App\Exceptions\BusinessRuleException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // The api group has no global throttle: the Next.js server is the only
        // caller (ADR-0001), so every guest would share one IP-keyed bucket.
        // Register and login set their own throttle:6,1 in routes/api/v1/auth.php.

        // API clients authenticate with bearer tokens only (ADR-0001). Without
        // this, a guest request that does not send Accept: application/json
        // fails with "Route [login] not defined" instead of a 401 envelope.
        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('api/*') ? null : '/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport(BusinessRuleException::class);

        // INV-01 error envelope. Everything under api/* answers in this shape,
        // whatever the Accept header says.
        $envelope = function (string $message, int $status, string $code, array $errors = []): JsonResponse {
            $body = ['success' => false, 'status' => $status, 'message' => $message, 'code' => $code];

            if ($errors !== []) {
                $body['errors'] = $errors;
            }

            return response()->json($body, $status);
        };

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (BusinessRuleException $e, Request $request) use ($envelope) {
            return $request->is('api/*') ? $envelope($e->getMessage(), $e->status(), $e->errorCode()) : null;
        });

        $exceptions->render(function (ValidationException $e, Request $request) use ($envelope) {
            return $request->is('api/*')
                ? $envelope('The given data was invalid.', 422, 'validation_failed', $e->errors())
                : null;
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($envelope) {
            return $request->is('api/*') ? $envelope('Unauthenticated.', 401, 'unauthenticated') : null;
        });

        // Laravel converts AuthorizationException (policies, $this->authorize())
        // into AccessDeniedHttpException before these callbacks run.
        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) use ($envelope) {
            return $request->is('api/*') ? $envelope('This action is unauthorized.', 403, 'forbidden') : null;
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) use ($envelope) {
            return $request->is('api/*') ? $envelope('Resource not found.', 404, 'not_found') : null;
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) use ($envelope) {
            return $request->is('api/*')
                ? $envelope('Too many requests.', 429, 'too_many_requests')->withHeaders($e->getHeaders())
                : null;
        });

        // Last resort for api/*: HTTP exceptions keep their status and headers
        // (maintenance mode answers 503 with Retry-After), anything else is a 500.
        // The exception text is never sent to the client because it can contain
        // SQL and bound values when APP_DEBUG is on.
        $exceptions->render(function (Throwable $e, Request $request) use ($envelope) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                $code = match (true) {
                    $status === 405 => 'method_not_allowed',
                    $status === 503 => 'service_unavailable',
                    $status >= 500 => 'server_error',
                    default => 'http_error',
                };
                $message = $status >= 500 && $status !== 503
                    ? 'Something went wrong on our side.'
                    : (Response::$statusTexts[$status] ?? 'Request failed.');

                return $envelope($message, $status, $code)->withHeaders($e->getHeaders());
            }

            return $envelope('Something went wrong on our side.', 500, 'server_error');
        });
    })->create();
