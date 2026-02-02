<?php

namespace App\Repository;

use App\Entity\Employee;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class EmployeeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Employee::class);
    }

    public function findAllWithDetails(): array
    {
        return $this->createQueryBuilder('e')
            ->leftJoin('e.meetings', 'm')
            ->leftJoin('e.agendaItems', 'a')
            ->addSelect('m', 'a')
            ->orderBy('e.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
