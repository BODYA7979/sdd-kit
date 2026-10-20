<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReviewStatus;
use Database\Factories\CompanyReviewFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property ReviewStatus $status
 */
class CompanyReview extends Model
{
    /** @use HasFactory<CompanyReviewFactory> */
    use HasFactory;

    use HasUuids;

    protected $fillable = [
        'company_id',
        'candidate_id',
        'rating',
        'title',
        'body',
        'status',
        'moderated_by',
        'moderated_at',
        'rejection_reason',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'status' => ReviewStatus::class,
            'moderated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function candidate(): BelongsTo
    {
        return $this->belongsTo(User::class, 'candidate_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }
}
