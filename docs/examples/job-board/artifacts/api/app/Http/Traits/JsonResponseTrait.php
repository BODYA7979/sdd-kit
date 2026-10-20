<?php

namespace App\Http\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Builds the INV-01 response envelopes. Every controller responds through
 * these helpers so the web client can rely on one shape.
 */
trait JsonResponseTrait
{
    /**
     * @param  array<string, mixed>  $data
     */
    protected function resource(array $data, string $message = 'OK', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'status' => $status,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    /**
     * Items that expose toApiArray() (the output DTOs) are serialized through it;
     * anything else is passed through unchanged.
     *
     * @param  LengthAwarePaginator<int, mixed>  $paginator
     * @param  array<string, mixed>  $meta  extra keys merged into the pagination meta
     */
    protected function paginated(LengthAwarePaginator $paginator, string $message = 'OK', array $meta = []): JsonResponse
    {
        $items = array_map(
            fn (mixed $item): mixed => is_object($item) && method_exists($item, 'toApiArray') ? $item->toApiArray() : $item,
            $paginator->items(),
        );

        return response()->json([
            'success' => true,
            'status' => 200,
            'message' => $message,
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                ...$meta,
            ],
        ]);
    }

    protected function noContent(): Response
    {
        return response()->noContent();
    }

    /**
     * @param  array<string, array<int, string>>  $errors
     */
    protected function error(string $message, int $status, string $code, array $errors = []): JsonResponse
    {
        $body = [
            'success' => false,
            'status' => $status,
            'message' => $message,
            'code' => $code,
        ];

        if ($errors !== []) {
            $body['errors'] = $errors;
        }

        return response()->json($body, $status);
    }
}
