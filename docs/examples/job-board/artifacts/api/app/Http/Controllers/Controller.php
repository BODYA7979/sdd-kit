<?php

namespace App\Http\Controllers;

use App\Http\Traits\JsonResponseTrait;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    use AuthorizesRequests;
    use JsonResponseTrait;
}
