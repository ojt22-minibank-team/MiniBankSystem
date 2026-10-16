
package com.corebanking.repository;

import com.corebanking.entity.AnnouncementReadStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnnouncementReadStatusRepository
        extends JpaRepository<AnnouncementReadStatus, Long> {

    boolean existsByCustomerIdAndAnnouncement_AnnouncementId(
            UUID customerId,
            Integer announcementId
    );

    Optional<AnnouncementReadStatus>
    findByCustomerIdAndAnnouncement_AnnouncementId(
            UUID customerId,
            Integer announcementId
    );

    List<AnnouncementReadStatus>
    findAllByCustomerIdAndAnnouncement_AnnouncementIdIn(
            UUID customerId,
            Collection<Integer> announcementIds
    );

    void deleteByCustomerIdAndAnnouncement_AnnouncementId(
            UUID customerId,
            Integer announcementId
    );
}
