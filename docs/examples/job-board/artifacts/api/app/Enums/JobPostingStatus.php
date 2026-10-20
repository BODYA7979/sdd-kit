<?php

namespace App\Enums;

/**
 * Only Open postings are public (BR-10). Draft and Closed postings stay
 * reachable internally, e.g. employers still see applications to closed jobs (BR-33).
 */
enum JobPostingStatus: string
{
    case Draft = 'draft';
    case Open = 'open';
    case Closed = 'closed';
}
