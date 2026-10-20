<?php

namespace App\Models;

use App\Enums\EmploymentType;
use App\Enums\JobPostingStatus;
use Database\Factories\JobPostingFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $company_id
 * @property string $title
 * @property string $description
 * @property string $location
 * @property bool $remote
 * @property EmploymentType $employment_type
 * @property int|null $salary_min
 * @property int|null $salary_max
 * @property string $salary_currency
 * @property JobPostingStatus $status
 * @property Carbon|null $published_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Company $company
 */
class JobPosting extends Model
{
    /** @use HasFactory<JobPostingFactory> */
    use HasFactory;

    use HasUuids;

    protected $fillable = [
        'company_id',
        'title',
        'description',
        'location',
        'remote',
        'employment_type',
        'salary_min',
        'salary_max',
        'salary_currency',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'remote' => 'boolean',
            'employment_type' => EmploymentType::class,
            'salary_min' => 'integer',
            'salary_max' => 'integer',
            'status' => JobPostingStatus::class,
            'published_at' => 'datetime',
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
     * @return HasMany<JobApplication, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }
}
