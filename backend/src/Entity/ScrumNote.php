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

    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'sos'])]
    private string $tab = 'sos';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $people = null;

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

    public function getTab(): string { return $this->tab; }
    public function setTab(string $tab): self { $this->tab = $tab; return $this; }

    /** @return int[] id сотрудников, из чьих 1-1 выросла заметка */
    public function getPeople(): array
    {
        if ($this->people === null) {
            return [];
        }
        return array_values(array_filter(array_map('intval', json_decode($this->people, true) ?? [])));
    }

    /** @param int[] $people */
    public function setPeople(array $people): self
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $people))));
        $this->people = $ids === [] ? null : json_encode($ids);
        return $this;
    }
}
