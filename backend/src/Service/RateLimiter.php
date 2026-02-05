<?php

namespace App\Service;

class RateLimiter
{
    private \Redis $redis;
    private int $maxAttempts;
    private int $windowSeconds;

    public function __construct(
        string $redisHost = 'redis',
        int $redisPort = 6379,
        int $maxAttempts = 5,
        int $windowSeconds = 300
    ) {
        $this->maxAttempts = $maxAttempts;
        $this->windowSeconds = $windowSeconds;

        $this->redis = new \Redis();
        $this->redis->connect($redisHost, $redisPort);
    }

    public function isRateLimited(string $key): bool
    {
        $redisKey = "rate_limit:$key";
        $count = $this->redis->lLen($redisKey);

        return $count >= $this->maxAttempts;
    }

    public function recordAttempt(string $key): void
    {
        $redisKey = "rate_limit:$key";
        $now = time();

        // Add current timestamp to list
        $this->redis->rPush($redisKey, $now);

        // Remove old attempts (outside window)
        $cutoff = $now - $this->windowSeconds;
        $this->redis->lTrim($redisKey, 0, -1);

        // Clean up old entries
        $attempts = $this->redis->lRange($redisKey, 0, -1);
        $validAttempts = array_filter($attempts, fn($t) => $t > $cutoff);

        // Recreate list with only valid attempts
        $this->redis->del($redisKey);
        foreach ($validAttempts as $timestamp) {
            $this->redis->rPush($redisKey, $timestamp);
        }

        // Set expiry to window duration
        $this->redis->expire($redisKey, $this->windowSeconds);
    }

    public function reset(string $key): void
    {
        $redisKey = "rate_limit:$key";
        $this->redis->del($redisKey);
    }

    public function getRemainingTime(string $key): int
    {
        $redisKey = "rate_limit:$key";
        $attempts = $this->redis->lRange($redisKey, 0, -1);

        if (empty($attempts)) {
            return 0;
        }

        $oldest = min($attempts);
        $unlockTime = $oldest + $this->windowSeconds;

        return max(0, $unlockTime - time());
    }
}
