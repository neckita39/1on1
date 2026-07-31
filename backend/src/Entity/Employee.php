<?php

namespace App\Entity;

use App\Repository\EmployeeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EmployeeRepository::class)]
#[ORM\Table(name: 'employees')]
class Employee
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $position = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $bio = null;

    #[ORM\Column(name: 'bitrix_id', type: Types::INTEGER, nullable: true, unique: true)]
    private ?int $bitrixId = null;

    #[ORM\Column(name: 'avatar_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column(name: 'name_instr', type: Types::STRING, length: 255, nullable: true)]
    private ?string $nameInstr = null;

    #[ORM\Column(name: 'calendar_event_id', type: Types::INTEGER, nullable: true)]
    private ?int $calendarEventId = null;

    #[ORM\Column(name: 'meeting_rule', type: Types::STRING, length: 255, nullable: true)]
    private ?string $meetingRule = null;

    #[ORM\Column(name: 'next_meeting_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTime $nextMeetingAt = null;

    #[ORM\Column(name: 'is_manager', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isManager = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $createdAt;

    #[ORM\OneToMany(targetEntity: Meeting::class, mappedBy: 'employee', cascade: ['remove'])]
    #[ORM\OrderBy(['date' => 'DESC'])]
    private Collection $meetings;

    #[ORM\OneToMany(targetEntity: AgendaItem::class, mappedBy: 'employee', cascade: ['remove'])]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $agendaItems;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->meetings = new ArrayCollection();
        $this->agendaItems = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getPosition(): ?string
    {
        return $this->position;
    }

    public function setPosition(?string $position): self
    {
        $this->position = $position;
        return $this;
    }

    public function getBio(): ?string
    {
        return $this->bio;
    }

    public function setBio(?string $bio): self
    {
        $this->bio = $bio;
        return $this;
    }

    public function getBitrixId(): ?int
    {
        return $this->bitrixId;
    }

    public function setBitrixId(?int $bitrixId): self
    {
        $this->bitrixId = $bitrixId;
        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): self
    {
        $this->avatarUrl = $avatarUrl;
        return $this;
    }

    public function getNameInstr(): ?string
    {
        return $this->nameInstr;
    }

    public function setNameInstr(?string $nameInstr): self
    {
        $this->nameInstr = $nameInstr;
        return $this;
    }

    public function getCalendarEventId(): ?int
    {
        return $this->calendarEventId;
    }

    public function setCalendarEventId(?int $calendarEventId): self
    {
        $this->calendarEventId = $calendarEventId;
        return $this;
    }

    public function getMeetingRule(): ?string
    {
        return $this->meetingRule;
    }

    public function setMeetingRule(?string $meetingRule): self
    {
        $this->meetingRule = $meetingRule;
        return $this;
    }

    public function getNextMeetingAt(): ?\DateTime
    {
        return $this->nextMeetingAt;
    }

    public function setNextMeetingAt(?\DateTime $nextMeetingAt): self
    {
        $this->nextMeetingAt = $nextMeetingAt;
        return $this;
    }

    public function isManager(): bool
    {
        return $this->isManager;
    }

    public function setIsManager(bool $isManager): self
    {
        $this->isManager = $isManager;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    public function getMeetings(): Collection
    {
        return $this->meetings;
    }

    public function getAgendaItems(): Collection
    {
        return $this->agendaItems;
    }

    public function getLastMeeting(): ?Meeting
    {
        return $this->meetings->first() ?: null;
    }

    public function getActiveAgendaCount(): int
    {
        return $this->agendaItems->filter(fn(AgendaItem $item) => !$item->isDiscussed())->count();
    }
}
