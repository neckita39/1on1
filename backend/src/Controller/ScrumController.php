<?php

namespace App\Controller;

use App\Entity\ScrumNote;
use App\Repository\ScrumNoteRepository;
use App\Service\AuthService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ScrumController extends AbstractController
{
    public function __construct(
        private ScrumNoteRepository $scrumNoteRepository,
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

    #[Route('/api/scrum-notes', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;
        $notes = $this->scrumNoteRepository->findBy([], ['date' => 'DESC']);
        return $this->json(array_map(fn(ScrumNote $note) => [
            'id' => $note->getId(),
            'content' => $note->getContent(),
            'date' => $note->getDate()->format('Y-m-d'),
            'tab' => $note->getTab(),
            'people' => $note->getPeople(),
            'createdAt' => $note->getCreatedAt()->format('c'),
            'updatedAt' => $note->getUpdatedAt()->format('c'),
        ], $notes));
    }

    #[Route('/api/scrum-notes', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;
        $data = json_decode($request->getContent(), true);
        if (empty($data['content'])) {
            return $this->json(['error' => 'Content is required'], Response::HTTP_BAD_REQUEST);
        }
        $note = new ScrumNote();
        $note->setContent($data['content']);
        if (!empty($data['date'])) {
            $note->setDate(new \DateTime($data['date']));
        }
        if (!empty($data['tab']) && in_array($data['tab'], ['sos', 'topics', 'decisions'], true)) {
            $note->setTab($data['tab']);
        }
        if (isset($data['people']) && is_array($data['people'])) {
            $note->setPeople($data['people']);
        }
        $this->em->persist($note);
        $this->em->flush();
        return $this->json([
            'id' => $note->getId(),
            'content' => $note->getContent(),
            'date' => $note->getDate()->format('Y-m-d'),
            'tab' => $note->getTab(),
            'people' => $note->getPeople(),
            'createdAt' => $note->getCreatedAt()->format('c'),
            'updatedAt' => $note->getUpdatedAt()->format('c'),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/scrum-notes/{id}', methods: ['PUT'])]
    public function update(Request $request, int $id): JsonResponse
    {
        if ($error = $this->checkAuth($request)) return $error;
        $note = $this->scrumNoteRepository->find($id);
        if (!$note) {
            return $this->json(['error' => 'Scrum note not found'], Response::HTTP_NOT_FOUND);
        }
        $data = json_decode($request->getContent(), true);
        if (isset($data['content']) && !empty($data['content'])) {
            $note->setContent($data['content']);
        }
        if (!empty($data['date'])) {
            $note->setDate(new \DateTime($data['date']));
        }
        if (!empty($data['tab']) && in_array($data['tab'], ['sos', 'topics', 'decisions'], true)) {
            $note->setTab($data['tab']);
        }
        if (isset($data['people']) && is_array($data['people'])) {
            $note->setPeople($data['people']);
        }
        $note->setUpdatedAt(new \DateTime());
        $this->em->flush();
        return $this->json([
            'id' => $note->getId(),
            'content' => $note->getContent(),
            'date' => $note->getDate()->format('Y-m-d'),
            'tab' => $note->getTab(),
            'people' => $note->getPeople(),
            'createdAt' => $note->getCreatedAt()->format('c'),
            'updatedAt' => $note->getUpdatedAt()->format('c'),
        ]);
    }
}
