<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * Feature tests run against the in-memory SQLite database configured in
 * phpunit.xml, never the dev database (GOTCHA-01 in CLAUDE.md).
 */
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');
