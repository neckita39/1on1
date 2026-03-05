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
}
