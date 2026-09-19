package com.corebanking.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.corebanking.entity.Announcements;

public interface AnnouncementsRepository

          extends JpaRepository<Announcements, Integer> {
}
