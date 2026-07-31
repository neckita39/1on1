<?php

namespace App\Service;

use App\Entity\Employee;
use App\Repository\EmployeeRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Находит в календаре Битрикс24 регулярные встречи вида «1-1 (Имя)»
 * и привязывает их к сотрудникам: правило повтора + дата следующей встречи.
 */
class CalendarSyncService
{
    // уменьшительные → каноническое имя (обе стороны сравнения прогоняются через эту карту)
    private const DIMINUTIVES = [
        'леша' => 'алексей', 'алеша' => 'алексей', 'лёха' => 'алексей',
        'саша' => 'александр', 'шура' => 'александр', 'саня' => 'александр',
        'маша' => 'мария', 'гриша' => 'григорий', 'сережа' => 'сергей',
        'дима' => 'дмитрий', 'женя' => 'евгений', 'коля' => 'николай',
        'ваня' => 'иван', 'миша' => 'михаил', 'петя' => 'петр',
        'настя' => 'анастасия', 'катя' => 'екатерина', 'оля' => 'ольга',
        'юля' => 'юлия', 'аня' => 'анна', 'таня' => 'татьяна',
        'наташа' => 'наталья', 'лена' => 'елена', 'света' => 'светлана',
        'тима' => 'тимофей', 'андрюха' => 'андрей', 'влад' => 'владислав',
        'вова' => 'владимир', 'слава' => 'вячеслав', 'паша' => 'павел',
    ];

    private const DAY_EACH = [
        'MO' => 'Каждый понедельник', 'TU' => 'Каждый вторник', 'WE' => 'Каждую среду',
        'TH' => 'Каждый четверг', 'FR' => 'Каждую пятницу', 'SA' => 'Каждую субботу',
        'SU' => 'Каждое воскресенье',
    ];

    private const DAY_PLURAL = [
        'MO' => 'понедельникам', 'TU' => 'вторникам', 'WE' => 'средам',
        'TH' => 'четвергам', 'FR' => 'пятницам', 'SA' => 'субботам',
        'SU' => 'воскресеньям',
    ];

    public function __construct(
        private BitrixService $bitrixService,
        private EmployeeRepository $employeeRepository,
        private EntityManagerInterface $em
    ) {}

    /**
     * @return array{matched: array, unmatchedEvents: array, unmatchedEmployees: array, syncedAt: string}|null
     *         null — календарь недоступен (не настроен вебхук или ошибка запроса)
     */
    public function sync(): ?array
    {
        $now = new \DateTime();
        $events = $this->bitrixService->getCalendarEvents($now, (clone $now)->modify('+45 days'));
        if ($events === null) {
            return null;
        }

        // инстансы серий «1-1 …», сгруппированные по названию
        $series = [];
        foreach ($events as $event) {
            $name = trim((string)($event['NAME'] ?? ''));
            if (!preg_match('~^1\s*-\s*1~u', $name)) {
                continue;
            }
            $series[$name][] = $event;
        }

        $employees = $this->employeeRepository->findAll();
        $ownerFirstName = $this->ownerFirstName();
        $matched = [];
        $unmatchedEvents = [];
        $matchedIds = [];

        // два прохода: сначала однозначные матчи («Сергей Ш» → Ширяев),
        // затем оставшиеся события без уже занятых кандидатов («Сергей» → Горшков)
        $pending = array_keys($series);
        for ($round = 0; $round < 2; $round++) {
            $stillPending = [];
            foreach ($pending as $name) {
                $employee = $this->matchEmployee($name, $employees, $matchedIds, $ownerFirstName);
                if ($employee === null) {
                    $stillPending[] = $name;
                    continue;
                }

                $instances = $series[$name];
                $next = $this->nearestInstance($instances, $now);
                $rule = $this->humanRule($instances);

                $employee->setCalendarEventId($next !== null ? (int)($next['PARENT_ID'] ?? $next['ID'] ?? 0) : null);
                $employee->setMeetingRule($rule);
                $employee->setNextMeetingAt($next !== null ? $this->parseDate($next['DATE_FROM']) : null);

                $matchedIds[$employee->getId()] = true;
                $matched[] = [
                    'employeeId' => $employee->getId(),
                    'employeeName' => $employee->getName(),
                    'eventName' => $name,
                    'rule' => $rule,
                    'next' => $employee->getNextMeetingAt()?->format('Y-m-d H:i'),
                ];
            }
            $pending = $stillPending;
        }
        $unmatchedEvents = $pending;

        // у кого серия из календаря пропала — очищаем, чтобы не показывать устаревшие даты
        $unmatchedEmployees = [];
        foreach ($employees as $employee) {
            if (!isset($matchedIds[$employee->getId()])) {
                $employee->setCalendarEventId(null);
                $employee->setMeetingRule(null);
                $employee->setNextMeetingAt(null);
                $unmatchedEmployees[] = $employee->getName();
            }
        }

        $this->em->flush();

        return [
            'matched' => $matched,
            'unmatchedEvents' => $unmatchedEvents,
            'unmatchedEmployees' => $unmatchedEmployees,
            'syncedAt' => $now->format('Y-m-d H:i'),
        ];
    }

    private function ownerFirstName(): ?string
    {
        $owner = $this->bitrixService->getOwner();
        if ($owner === null || trim($owner['name']) === '') {
            return null;
        }
        $words = preg_split('~\s+~u', trim($owner['name']));
        return $this->canonName($words[0]);
    }

    /**
     * @param Employee[] $employees
     * @param array<int,bool> $excludeIds уже сматченные в этом синке
     */
    private function matchEmployee(string $eventName, array $employees, array $excludeIds, ?string $ownerFirstName): ?Employee
    {
        preg_match_all('~\(([^)]+)\)~u', $eventName, $m);
        $tokens = [];
        foreach ($m[1] as $group) {
            foreach (preg_split('~[-,/]~u', $group) as $part) {
                $part = trim($part);
                if ($part !== '') {
                    $tokens[] = $part;
                }
            }
        }

        foreach ($tokens as $token) {
            $words = preg_split('~\s+~u', $token);
            $first = $this->canonName($words[0]);
            $surnamePrefix = isset($words[1]) ? $this->normalize($words[1]) : null;

            $candidates = [];
            foreach ($employees as $employee) {
                if (isset($excludeIds[$employee->getId()])) {
                    continue;
                }

                // «1-1 (Никита)» с именем владельца календаря — встреча с МОИМ тимлидом
                if ($surnamePrefix === null && $first === $ownerFirstName) {
                    if ($employee->isManager()) {
                        $candidates[] = $employee;
                    }
                    continue;
                }

                $empWords = preg_split('~\s+~u', trim($employee->getName()));
                if ($this->canonName($empWords[0]) !== $first) {
                    continue;
                }
                if ($surnamePrefix !== null) {
                    $empLast = $this->normalize($empWords[1] ?? '');
                    if (!str_starts_with($empLast, $surnamePrefix)) {
                        continue;
                    }
                }
                $candidates[] = $employee;
            }

            if (count($candidates) === 1) {
                return $candidates[0];
            }
        }

        return null;
    }

    private function normalize(string $word): string
    {
        return str_replace('ё', 'е', mb_strtolower(trim($word)));
    }

    private function canonName(string $word): string
    {
        $w = $this->normalize($word);
        return self::DIMINUTIVES[$w] ?? $w;
    }

    private function parseDate(string $value): ?\DateTime
    {
        return \DateTime::createFromFormat('d.m.Y H:i:s', $value) ?: null;
    }

    private function nearestInstance(array $instances, \DateTime $now): ?array
    {
        $best = null;
        $bestDate = null;
        foreach ($instances as $instance) {
            $date = $this->parseDate((string)($instance['DATE_FROM'] ?? ''));
            if ($date === null || $date < $now) {
                continue;
            }
            if ($bestDate === null || $date < $bestDate) {
                $best = $instance;
                $bestDate = $date;
            }
        }
        return $best;
    }

    private function humanRule(array $instances): ?string
    {
        // для правила берём инстанс с RRULE (одиночные переносы серии идут без него)
        $withRule = null;
        $any = null;
        foreach ($instances as $instance) {
            $any ??= $instance;
            if (!empty($instance['RRULE']) && is_array($instance['RRULE'])) {
                $withRule = $instance;
                break;
            }
        }

        $source = $withRule ?? $any;
        if ($source === null) {
            return null;
        }

        $from = $this->parseDate((string)($source['DATE_FROM'] ?? ''));
        $to = $this->parseDate((string)($source['DATE_TO'] ?? ''));
        if ($from === null) {
            return null;
        }

        $time = $from->format('H:i');
        $minutes = $to !== null ? max(5, (int)(($to->getTimestamp() - $from->getTimestamp()) / 60)) : null;
        $durationPart = $minutes !== null ? " — {$minutes} минут" : '';

        if ($withRule === null) {
            return "Разовая встреча, {$time}{$durationPart}";
        }

        $rrule = $withRule['RRULE'];
        if (($rrule['FREQ'] ?? '') !== 'WEEKLY') {
            return "Повторяется, {$time}{$durationPart}";
        }

        $interval = max(1, (int)($rrule['INTERVAL'] ?? 1));
        $day = array_key_first((array)($rrule['BYDAY'] ?? [])) ?? strtoupper(substr($from->format('D'), 0, 2));

        if ($interval === 1) {
            $freq = self::DAY_EACH[$day] ?? 'Каждую неделю';
        } else {
            $plural = self::DAY_PLURAL[$day] ?? null;
            $freq = $plural !== null ? "Раз в {$interval} недели по {$plural}" : "Раз в {$interval} недели";
        }

        return "{$freq}, {$time}{$durationPart}";
    }
}
