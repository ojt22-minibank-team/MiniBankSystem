
package com.corebanking.repository;

import com.corebanking.entity.Announcements;
import com.corebanking.entity.enums.AnnouncementAudience;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
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
}