<?php

namespace App\Entity;

use App\Repository\ScrumNoteRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ScrumNoteRepository::class)]
#[ORM\Table(name: 'scrum_notes')]
class ScrumNote
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $content;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $date;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $updatedAt;

    public function __construct()
    {
        $this->date = new \DateTime();
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->content = '';
    }

    public function getId(): ?int { return $this->id; }

    public function getContent(): string { return $this->content; }
    public function setContent(string $content): self { $this->content = $content; return $this; }

    public function getDate(): \DateTime { return $this->date; }
    public function setDate(\DateTime $date): self { $this->date = $date; return $this; }

    public function getCreatedAt(): \DateTime { return $this->createdAt; }

    public function getUpdatedAt(): \DateTime { return $this->updatedAt; }
    public function setUpdatedAt(\DateTime $updatedAt): self { $this->updatedAt = $updatedAt; return $this; }
}
