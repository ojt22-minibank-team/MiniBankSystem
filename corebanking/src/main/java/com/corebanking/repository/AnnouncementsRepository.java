package com.corebanking.repository;

import com.corebanking.entity.Announcements;
import com.corebanking.entity.enums.AnnouncementAudience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AnnouncementsRepository
        extends JpaRepository<Announcements, Integer> {

    @Query("""
            SELECT a
            FROM Announcements a
            WHERE a.isActive = true
              AND a.startsAt <= :now
              AND (a.endsAt IS NULL OR a.endsAt > :now)
              AND (a.audience = :audience OR a.audience = :allAudience)
            ORDER BY a.startsAt DESC
            """)
    List<Announcements> findVisibleAnnouncements(
            @Param("audience") AnnouncementAudience audience,
            @Param("allAudience") AnnouncementAudience allAudience,
            @Param("now") LocalDateTime now
    );

    @Query("""
            SELECT a
            FROM Announcements a
            WHERE a.announcementId = :announcementId
              AND a.isActive = true
              AND a.startsAt <= :now
              AND (a.endsAt IS NULL OR a.endsAt > :now)
              AND (a.audience = :audience OR a.audience = :allAudience)
            """)
    Optional<Announcements> findVisibleAnnouncementById(
            @Param("announcementId") Integer announcementId,
            @Param("audience") AnnouncementAudience audience,
            @Param("allAudience") AnnouncementAudience allAudience,
            @Param("now") LocalDateTime now
    );
}
