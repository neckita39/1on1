<?php

namespace App\Controller;

use App\Entity\Meeting;
use App\Repository\MeetingRepository;
use App\Repository\EmployeeRepository;
use App\Service\AuthService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class MeetingController extends AbstractController
{
    public function __construct(
        private MeetingRepository $meetingRepository,
        private EmployeeRepository $employeeRepository,
        private EntityManagerInterface $em,
        private AuthService $authService
    ) {}

    private function checkAuth(Request $request): ?JsonResponse
    {
        if (!$this->authService->isAuthenticated($request)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }
        return null;
    }

    #[Route('/api/employees/{employeeId}/meetings', methods: ['GET'])]
    public function list(Request $request, int $employeeId): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($employeeId);
        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        $meetings = $this->meetingRepository->findBy(
            ['employee' => $employee],
            ['date' => 'DESC']
        );

        return $this->json(array_map(fn(Meeting $m) => [
            'id' => $m->getId(),
            'date' => $m->getDate()->format('Y-m-d'),
            'notes' => $m->getNotes(),
            'discussedTopics' => $m->getDiscussedTopics(),
            'createdAt' => $m->getCreatedAt()->format('c')
        ], $meetings));
    }

    #[Route('/api/employees/{employeeId}/meetings', methods: ['POST'])]
    public function create(Request $request, int $employeeId): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($employeeId);
        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        $meeting = new Meeting();
        $meeting->setEmployee($employee);
        $meeting->setNotes($data['notes'] ?? '');

        if (!empty($data['date'])) {
            $meeting->setDate(new \DateTime($data['date']));
        }

        if (!empty($data['discussedTopics']) && is_array($data['discussedTopics'])) {
            $meeting->setDiscussedTopics($data['discussedTopics']);
        }

        $this->em->persist($meeting);
        $this->em->flush();

        return $this->json([
            'id' => $meeting->getId(),
            'date' => $meeting->getDate()->format('Y-m-d'),
            'notes' => $meeting->getNotes(),
            'discussedTopics' => $meeting->getDiscussedTopics(),
            'createdAt' => $meeting->getCreatedAt()->format('c')
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/meetings/{id}', methods: ['GET'])]
    public function show(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $meeting = $this->meetingRepository->find($id);
        if (!$meeting) {
            return $this->json(['error' => 'Meeting not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id' => $meeting->getId(),
            'employeeId' => $meeting->getEmployee()->getId(),
            'employeeName' => $meeting->getEmployee()->getName(),
            'date' => $meeting->getDate()->format('Y-m-d'),
            'notes' => $meeting->getNotes(),
            'discussedTopics' => $meeting->getDiscussedTopics(),
            'createdAt' => $meeting->getCreatedAt()->format('c')
        ]);
    }
}
