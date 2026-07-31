<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class BitrixService
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private ?string $webhookUrl = null
    ) {}

    public function isConfigured(): bool
    {
        return !empty($this->webhookUrl);
    }

    /**
     * @return array{name: string, position: string|null, avatarUrl: string|null}|null
     */
    public function getUser(int $bitrixId): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        $url = rtrim($this->webhookUrl, '/') . '/user.get.json';

        try {
            $response = $this->httpClient->request('GET', $url, [
                'query' => ['ID' => $bitrixId],
                'timeout' => 10,
            ]);

            $data = $response->toArray();
        } catch (\Throwable) {
            return null;
        }

        if (empty($data['result'][0])) {
            return null;
        }

        $user = $data['result'][0];

        $name = trim(($user['NAME'] ?? '') . ' ' . ($user['LAST_NAME'] ?? ''));
        if (empty($name)) {
            $name = $user['EMAIL'] ?? 'User #' . $bitrixId;
        }

        return [
            'name' => $name,
            'position' => $user['WORK_POSITION'] ?? null,
            'avatarUrl' => $user['PERSONAL_PHOTO'] ?? null,
        ];
    }

    /**
     * Инстансы событий календаря владельца вебхука за период
     * (повторяющиеся серии приходят развёрнутыми в отдельные инстансы).
     */
    public function getCalendarEvents(\DateTimeInterface $from, \DateTimeInterface $to): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        if (!preg_match('~/rest/(\d+)/~', $this->webhookUrl, $m)) {
            return null;
        }

        $url = rtrim($this->webhookUrl, '/') . '/calendar.event.get.json';

        try {
            $response = $this->httpClient->request('GET', $url, [
                'query' => [
                    'type' => 'user',
                    'ownerId' => (int)$m[1],
                    'from' => $from->format('Y-m-d'),
                    'to' => $to->format('Y-m-d'),
                ],
                'timeout' => 15,
            ]);

            $data = $response->toArray();
        } catch (\Throwable) {
            return null;
        }

        return is_array($data['result'] ?? null) ? $data['result'] : null;
    }
}
