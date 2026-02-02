<?php

namespace App\Entity;

use App\Repository\AgendaItemRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AgendaItemRepository::class)]
#[ORM\Table(name: 'agenda_items')]
class AgendaItem
{
    public const CATEGORY_NOTE = 'note';
    public const CATEGORY_POSITIVE = 'positive';
    public const CATEGORY_WARNING = 'warning';
    public const CATEGORY_PROBLEM = 'problem';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Employee::class, inversedBy: 'agendaItems')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Employee $employee;

    #[ORM\Column(type: Types::STRING, length: 500)]
    private string $content;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isDiscussed = false;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $category = self::CATEGORY_NOTE;

    #[ORM\Column(type: Types::INTEGER)]
    private int $sortOrder = 0;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmployee(): Employee
    {
        return $this->employee;
    }

    public function setEmployee(Employee $employee): self
    {
        $this->employee = $employee;
        return $this;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function setContent(string $content): self
    {
        $this->content = $content;
        return $this;
    }

    public function isDiscussed(): bool
    {
        return $this->isDiscussed;
    }

    public function setIsDiscussed(bool $isDiscussed): self
    {
        $this->isDiscussed = $isDiscussed;
        return $this;
    }

    public function getCategory(): string
    {
        return $this->category;
    }

    public function setCategory(string $category): self
    {
        $validCategories = [self::CATEGORY_NOTE, self::CATEGORY_POSITIVE, self::CATEGORY_WARNING, self::CATEGORY_PROBLEM];
        if (in_array($category, $validCategories)) {
            $this->category = $category;
        }
        return $this;
    }

    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }

    public function setSortOrder(int $sortOrder): self
    {
        $this->sortOrder = $sortOrder;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }
}
