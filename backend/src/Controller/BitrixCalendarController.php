<?php

namespace App\Controller;

use App\Service\AuthService;
use App\Service\BitrixService;
use App\Service\CalendarSyncService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class BitrixCalendarController extends AbstractController
{
    public function __construct(
        private AuthService $authService,
        private BitrixService $bitrixService,
        private CalendarSyncService $calendarSyncService
    ) {}

    #[Route('/api/bitrix/sync-calendar', methods: ['POST'])]
    public function sync(Request $request): JsonResponse
    {
        if (!$this->authService->isAuthenticated($request)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        if (!$this->bitrixService->isConfigured()) {
            return $this->json(['error' => 'Bitrix24 is not configured'], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->calendarSyncService->sync();
        if ($result === null) {
            return $this->json(['error' => 'Failed to fetch Bitrix24 calendar'], Response::HTTP_BAD_GATEWAY);
        }

        return $this->json($result);
    }
}
