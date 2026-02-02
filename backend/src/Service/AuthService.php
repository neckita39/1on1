<?php

namespace App\Service;

use App\Entity\Settings;
use App\Repository\SettingsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;

class AuthService
{
    private const TOKEN_COOKIE_NAME = 'auth_token';
    private const TOKEN_EXPIRY_DAYS = 7;

    public function __construct(
        private SettingsRepository $settingsRepository,
        private EntityManagerInterface $em,
        private string $jwtSecret
    ) {}

    public function needsSetup(): bool
    {
        $settings = $this->settingsRepository->getSettings();
        return $settings->getPasswordHash() === null;
    }

    public function setupPassword(string $password): void
    {
        $settings = $this->settingsRepository->getSettings();
        $settings->setPasswordHash(password_hash($password, PASSWORD_DEFAULT));
        $this->em->flush();
    }

    public function verifyPassword(string $password): bool
    {
        $settings = $this->settingsRepository->getSettings();
        $hash = $settings->getPasswordHash();

        if ($hash === null) {
            return false;
        }

        return password_verify($password, $hash);
    }

    public function createToken(): string
    {
        $payload = [
            'iat' => time(),
            'exp' => time() + (self::TOKEN_EXPIRY_DAYS * 24 * 60 * 60),
            'sub' => 'admin'
        ];

        return JWT::encode($payload, $this->jwtSecret, 'HS256');
    }

    public function createAuthCookie(string $token): Cookie
    {
        return Cookie::create(self::TOKEN_COOKIE_NAME)
            ->withValue($token)
            ->withExpires(time() + (self::TOKEN_EXPIRY_DAYS * 24 * 60 * 60))
            ->withPath('/')
            ->withHttpOnly(true)
            ->withSameSite('lax');
    }

    public function createLogoutCookie(): Cookie
    {
        return Cookie::create(self::TOKEN_COOKIE_NAME)
            ->withValue('')
            ->withExpires(1)
            ->withPath('/')
            ->withHttpOnly(true);
    }

    public function isAuthenticated(Request $request): bool
    {
        $token = $request->cookies->get(self::TOKEN_COOKIE_NAME);

        if (!$token) {
            return false;
        }

        try {
            JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
