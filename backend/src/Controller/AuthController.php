<?php

namespace App\Controller;

use App\Service\AuthService;
use App\Service\RateLimiter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    public function __construct(
        private AuthService $authService,
        private RateLimiter $rateLimiter
    ) {}

    #[Route('/check', methods: ['GET'])]
    public function check(Request $request): JsonResponse
    {
        $needsSetup = $this->authService->needsSetup();
        $isAuthenticated = $this->authService->isAuthenticated($request);

        return $this->json([
            'needsSetup' => $needsSetup,
            'isAuthenticated' => $isAuthenticated
        ]);
    }

    #[Route('/setup', methods: ['POST'])]
    public function setup(Request $request): JsonResponse
    {
        if (!$this->authService->needsSetup()) {
            return $this->json(['error' => 'Password already set'], Response::HTTP_BAD_REQUEST);
        }

        $data = json_decode($request->getContent(), true);
        $password = $data['password'] ?? '';

        if (strlen($password) < 12) {
            return $this->json(['error' => 'Password must be at least 12 characters'], Response::HTTP_BAD_REQUEST);
        }

        $this->authService->setupPassword($password, $data['login'] ?? null);
        $token = $this->authService->createToken();

        $response = $this->json(['success' => true]);
        $response->headers->setCookie($this->authService->createAuthCookie($token));

        return $response;
    }

    #[Route('/login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        if ($this->authService->needsSetup()) {
            return $this->json(['error' => 'Setup required'], Response::HTTP_BAD_REQUEST);
        }

        $clientIp = $request->getClientIp() ?? 'unknown';
        $rateLimitKey = 'login:' . $clientIp;

        // Check rate limit
        if ($this->rateLimiter->isRateLimited($rateLimitKey)) {
            $remainingTime = $this->rateLimiter->getRemainingTime($rateLimitKey);
            return $this->json([
                'error' => 'Too many login attempts. Please try again in ' . ceil($remainingTime / 60) . ' minutes.'
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $data = json_decode($request->getContent(), true);
        $password = $data['password'] ?? '';

        $loginOk = $this->authService->verifyLogin($data['login'] ?? null);

        if (!$loginOk || !$this->authService->verifyPassword($password)) {
            $this->rateLimiter->recordAttempt($rateLimitKey);
            return $this->json(['error' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
        }

        // Successful login - reset rate limit
        $this->rateLimiter->reset($rateLimitKey);

        $token = $this->authService->createToken();

        $response = $this->json(['success' => true]);
        $response->headers->setCookie($this->authService->createAuthCookie($token));

        return $response;
    }

    #[Route('/logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        $response = $this->json(['success' => true]);
        $response->headers->setCookie($this->authService->createLogoutCookie());

        return $response;
    }
}
