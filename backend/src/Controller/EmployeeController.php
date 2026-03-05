<?php

namespace App\Controller;

use App\Entity\Employee;
use App\Repository\EmployeeRepository;
use App\Service\AuthService;
use App\Service\BitrixService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/employees')]
class EmployeeController extends AbstractController
{
    public function __construct(
        private EmployeeRepository $employeeRepository,
        private EntityManagerInterface $em,
        private AuthService $authService,
        private BitrixService $bitrixService
    ) {}

    private function checkAuth(Request $request): ?JsonResponse
    {
        if (!$this->authService->isAuthenticated($request)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }
        return null;
    }

    #[Route('', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employees = $this->employeeRepository->findAllWithDetails();

        return $this->json(array_map(fn(Employee $e) => [
            'id' => $e->getId(),
            'name' => $e->getName(),
            'position' => $e->getPosition(),
            'bio' => $e->getBio(),
            'bitrixId' => $e->getBitrixId(),
            'avatarUrl' => $e->getAvatarUrl(),
            'lastMeetingDate' => $e->getLastMeeting()?->getDate()->format('Y-m-d'),
            'agendaCount' => $e->getActiveAgendaCount(),
            'createdAt' => $e->getCreatedAt()->format('c')
        ], $employees));
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $data = json_decode($request->getContent(), true);

        if (empty($data['name'])) {
            return $this->json(['error' => 'Name is required'], Response::HTTP_BAD_REQUEST);
        }

        $bitrixId = isset($data['bitrixId']) ? (int)$data['bitrixId'] : null;

        if ($bitrixId !== null) {
            $existing = $this->employeeRepository->findOneBy(['bitrixId' => $bitrixId]);
            if ($existing) {
                return $this->json(['error' => 'Employee with this Bitrix24 ID already exists'], Response::HTTP_CONFLICT);
            }
        }

        $employee = new Employee();
        $employee->setName($data['name']);
        $employee->setPosition($data['position'] ?? null);
        $employee->setBio($data['bio'] ?? null);
        $employee->setBitrixId($bitrixId);
        $employee->setAvatarUrl($data['avatarUrl'] ?? null);

        $this->em->persist($employee);
        $this->em->flush();

        return $this->json([
            'id' => $employee->getId(),
            'name' => $employee->getName(),
            'position' => $employee->getPosition(),
            'bio' => $employee->getBio(),
            'bitrixId' => $employee->getBitrixId(),
            'avatarUrl' => $employee->getAvatarUrl(),
            'createdAt' => $employee->getCreatedAt()->format('c')
        ], Response::HTTP_CREATED);
    }

    #[Route('/bitrix-status', methods: ['GET'])]
    public function bitrixStatus(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        return $this->json(['configured' => $this->bitrixService->isConfigured()]);
    }

    #[Route('/bitrix-preview/{bitrixId}', methods: ['GET'])]
    public function bitrixPreview(Request $request, int $bitrixId): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        if (!$this->bitrixService->isConfigured()) {
            return $this->json(['error' => 'Bitrix24 is not configured'], Response::HTTP_BAD_REQUEST);
        }

        $existing = $this->employeeRepository->findOneBy(['bitrixId' => $bitrixId]);
        if ($existing) {
            return $this->json(['error' => 'Employee with this Bitrix24 ID already exists', 'employeeId' => $existing->getId()], Response::HTTP_CONFLICT);
        }

        $user = $this->bitrixService->getUser($bitrixId);
        if (!$user) {
            return $this->json(['error' => 'User not found in Bitrix24'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($user);
    }

    #[Route('/{id}', methods: ['GET'])]
    public function show(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($id);

        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id' => $employee->getId(),
            'name' => $employee->getName(),
            'position' => $employee->getPosition(),
            'bio' => $employee->getBio(),
            'bitrixId' => $employee->getBitrixId(),
            'avatarUrl' => $employee->getAvatarUrl(),
            'lastMeetingDate' => $employee->getLastMeeting()?->getDate()->format('Y-m-d'),
            'agendaCount' => $employee->getActiveAgendaCount(),
            'createdAt' => $employee->getCreatedAt()->format('c')
        ]);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($id);

        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name']) && !empty($data['name'])) {
            $employee->setName($data['name']);
        }
        if (array_key_exists('position', $data)) {
            $employee->setPosition($data['position']);
        }
        if (array_key_exists('bio', $data)) {
            $employee->setBio($data['bio']);
        }
        if (array_key_exists('bitrixId', $data)) {
            $bitrixId = $data['bitrixId'] !== null ? (int)$data['bitrixId'] : null;
            if ($bitrixId !== null) {
                $existing = $this->employeeRepository->findOneBy(['bitrixId' => $bitrixId]);
                if ($existing && $existing->getId() !== $employee->getId()) {
                    return $this->json(['error' => 'Employee with this Bitrix24 ID already exists'], Response::HTTP_CONFLICT);
                }
            }
            $employee->setBitrixId($bitrixId);
        }
        if (array_key_exists('avatarUrl', $data)) {
            $employee->setAvatarUrl($data['avatarUrl']);
        }

        $this->em->flush();

        return $this->json([
            'id' => $employee->getId(),
            'name' => $employee->getName(),
            'position' => $employee->getPosition(),
            'bio' => $employee->getBio(),
            'bitrixId' => $employee->getBitrixId(),
            'avatarUrl' => $employee->getAvatarUrl(),
            'createdAt' => $employee->getCreatedAt()->format('c')
        ]);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($id);

        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($employee);
        $this->em->flush();

        return $this->json(['success' => true]);
    }
}
