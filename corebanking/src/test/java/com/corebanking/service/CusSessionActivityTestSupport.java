package com.corebanking.service;

import com.corebanking.entity.AuthSession;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.CusAuthSessionsRepository;
import jakarta.persistence.EntityManager;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Mock repository boundary for existing unit/MockMvc fixtures only.
 * Actual SQL, locking, auto-flush and transaction safety are tested separately
 * with production repositories/services and isolated MySQL/Hibernate. */
public final class CusSessionActivityTestSupport {
    private CusSessionActivityTestSupport() { }

    public static void wire(CusSessionService service, CusAuthSessionsRepository repository,
                            Supplier<AuthSession> row) {
        ReflectionTestUtils.setField(service, "entityManager", mock(EntityManager.class));
        lenient().when(repository.findForActivity(anyString(), any(SessionSubjectType.class))).thenAnswer(call -> {
            AuthSession current = row.get();
            return current != null && current.getSessionUuid().equals(call.getArgument(0))
                    && current.getSubjectType() == call.getArgument(1) ? Optional.of(current) : Optional.empty();
        });
        lenient().when(repository.touchIfValid(anyString(), any(SessionSubjectType.class), any(UUID.class),
                anyLong(), any(UpdatedByType.class), any(LocalDateTime.class))).thenAnswer(call -> {
            AuthSession current = row.get();
            String sid = call.getArgument(0); SessionSubjectType type = call.getArgument(1);
            UUID owner = call.getArgument(2); long version = call.getArgument(3);
            UpdatedByType actor = call.getArgument(4); LocalDateTime now = call.getArgument(5);
            UUID actualOwner = type == SessionSubjectType.CUSTOMER
                    ? current.getCustomer().getCustomerId() : current.getCorporateUser().getCorporateUserId();
            if (!sid.equals(current.getSessionUuid()) || type != current.getSubjectType() || !owner.equals(actualOwner)
                    || current.getTokenVersionAtIssue() != version || current.getRevokedAt() != null
                    || current.getIssuedAt() == null || !current.getIssuedAt().plusHours(24).isAfter(now)
                    || current.getRefreshExpiresAt() == null || !current.getRefreshExpiresAt().isAfter(now)
                    || current.getLastSeenAt() == null || !current.getLastSeenAt().plusMinutes(current.getIdleTimeoutMinutes()).isAfter(now)) return 0;
            if (current.getLastSeenAt().isBefore(now)) current.setLastSeenAt(now);
            if (current.getUpdatedAt() == null || current.getUpdatedAt().isBefore(now)) current.setUpdatedAt(now);
            current.setUpdatedByType(actor); current.setUpdatedById(owner);
            return 1;
        });
    }
}
