<?php

namespace App\Enums;

enum UserRole: string
{
    case Candidate = 'candidate';
    case Employer = 'employer';
    case Admin = 'admin';

    /**
     * Roles a visitor may pick when registering (BR-01). Admins are seeded only.
     *
     * @return array<int, string>
     */
    public static function selfRegistrable(): array
    {
        return [self::Candidate->value, self::Employer->value];
    }
}
