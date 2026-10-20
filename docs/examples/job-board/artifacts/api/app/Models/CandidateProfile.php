<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CandidateProfileFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property int $user_id
 * @property string $headline
 * @property string|null $location
 * @property string|null $bio
 * @property list<string> $skills
 * @property int $years_experience
 * @property bool $open_to_work
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class CandidateProfile extends Model
{
    /** @use HasFactory<CandidateProfileFactory> */
    use HasFactory;

    use HasUuids;

    protected $fillable = [
        'user_id',
        'headline',
        'location',
        'bio',
        'skills',
        'years_experience',
        'open_to_work',
    ];

    protected function casts(): array
    {
        return [
            'skills' => 'array',
            'years_experience' => 'integer',
            'open_to_work' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
