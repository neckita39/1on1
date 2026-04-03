<?php

namespace App\Controller;

use App\Entity\AgendaItem;
use App\Repository\AgendaItemRepository;
use App\Repository\EmployeeRepository;
use App\Service\AuthService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class AgendaController extends AbstractController
{
    public function __construct(
        private AgendaItemRepository $agendaItemRepository,
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

    #[Route('/api/employees/{employeeId}/agenda', methods: ['GET'])]
    public function list(Request $request, int $employeeId): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($employeeId);
        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        $items = $this->agendaItemRepository->findBy(
            ['employee' => $employee],
            ['sortOrder' => 'ASC', 'createdAt' => 'ASC']
        );

        return $this->json(array_map(fn(AgendaItem $item) => [
            'id' => $item->getId(),
            'content' => $item->getContent(),
            'isDiscussed' => $item->isDiscussed(),
            'isImportant' => $item->isImportant(),
            'category' => $item->getCategory(),
            'sortOrder' => $item->getSortOrder(),
            'createdAt' => $item->getCreatedAt()->format('c')
        ], $items));
    }

    #[Route('/api/employees/{employeeId}/agenda', methods: ['POST'])]
    public function create(Request $request, int $employeeId): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($employeeId);
        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (empty($data['content'])) {
            return $this->json(['error' => 'Content is required'], Response::HTTP_BAD_REQUEST);
        }

        // Get max sortOrder for this employee
        $maxSortOrder = $this->agendaItemRepository->createQueryBuilder('a')
            ->select('MAX(a.sortOrder)')
            ->where('a.employee = :employee')
            ->setParameter('employee', $employee)
            ->getQuery()
            ->getSingleScalarResult();

        $item = new AgendaItem();
        $item->setEmployee($employee);
        $item->setContent($data['content']);
        $item->setSortOrder(($maxSortOrder ?? 0) + 1);

        if (!empty($data['category'])) {
            $item->setCategory($data['category']);
        }

        $this->em->persist($item);
        $this->em->flush();

        return $this->json([
            'id' => $item->getId(),
            'content' => $item->getContent(),
            'isDiscussed' => $item->isDiscussed(),
            'isImportant' => $item->isImportant(),
            'category' => $item->getCategory(),
            'sortOrder' => $item->getSortOrder(),
            'createdAt' => $item->getCreatedAt()->format('c')
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/agenda/{id}', methods: ['PUT'])]
    public function update(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $item = $this->agendaItemRepository->find($id);
        if (!$item) {
            return $this->json(['error' => 'Agenda item not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['content']) && !empty($data['content'])) {
            $item->setContent($data['content']);
        }
        if (isset($data['isDiscussed'])) {
            $item->setIsDiscussed((bool) $data['isDiscussed']);
        }
        if (isset($data['category'])) {
            $item->setCategory($data['category']);
        }
        if (isset($data['isImportant'])) {
            $item->setIsImportant((bool) $data['isImportant']);
        }

        $this->em->flush();

        return $this->json([
            'id' => $item->getId(),
            'content' => $item->getContent(),
            'isDiscussed' => $item->isDiscussed(),
            'isImportant' => $item->isImportant(),
            'category' => $item->getCategory(),
            'sortOrder' => $item->getSortOrder(),
            'createdAt' => $item->getCreatedAt()->format('c')
        ]);
    }

    #[Route('/api/agenda/important', methods: ['GET'])]
    public function listImportant(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $items = $this->agendaItemRepository->findBy(
            ['isImportant' => true],
            ['createdAt' => 'DESC']
        );

        return $this->json(array_map(fn(AgendaItem $item) => [
            'id' => $item->getId(),
            'content' => $item->getContent(),
            'category' => $item->getCategory(),
            'isDiscussed' => $item->isDiscussed(),
            'isImportant' => $item->isImportant(),
            'createdAt' => $item->getCreatedAt()->format('c'),
            'employeeId' => $item->getEmployee()->getId(),
            'employeeName' => $item->getEmployee()->getName(),
        ], $items));
    }

    #[Route('/api/employees/{employeeId}/agenda/reorder', methods: ['PUT'])]
    public function reorder(Request $request, int $employeeId): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $employee = $this->employeeRepository->find($employeeId);
        if (!$employee) {
            return $this->json(['error' => 'Employee not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['itemIds']) || !is_array($data['itemIds'])) {
            return $this->json(['error' => 'itemIds array is required'], Response::HTTP_BAD_REQUEST);
        }

        $sortOrder = 0;
        foreach ($data['itemIds'] as $itemId) {
            $item = $this->agendaItemRepository->find($itemId);
            if ($item && $item->getEmployee()->getId() === $employeeId) {
                $item->setSortOrder($sortOrder);
                $sortOrder++;
            }
        }

        $this->em->flush();

        return $this->json(['success' => true]);
    }

    #[Route('/api/agenda/{id}', methods: ['DELETE'])]
    public function delete(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;

        $item = $this->agendaItemRepository->find($id);
        if (!$item) {
            return $this->json(['error' => 'Agenda item not found'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($item);
        $this->em->flush();

        return $this->json(['success' => true]);
    }
}
