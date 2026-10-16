package com.corebanking.repository;

import com.corebanking.entity.Notifications;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notifications, Long> {

    List<Notifications> findByCustomer_CustomerIdOrderByCreatedAtDesc(UUID customerId);

    long countByCustomer_CustomerIdAndIsReadFalse(UUID customerId);

    Optional<Notifications> findByNotificationIdAndCustomer_CustomerId(Long notificationId, UUID customerId);

    @Modifying
    @Query("UPDATE Notifications n SET n.isRead = true, n.readAt = :readAt WHERE n.customer.customerId = :customerId AND n.isRead = false")
    int markAllAsRead(@Param("customerId") UUID customerId, @Param("readAt") LocalDateTime readAt);
}
