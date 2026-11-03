
package com.corebanking.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.corebanking.repository.AuthSessionsRepository;

@Service
public class SessionRevocationService {

    private final AuthSessionsRepository authSessionsRepository;

    public SessionRevocationService(
            AuthSessionsRepository authSessionsRepository
    ) {
        this.authSessionsRepository = authSessionsRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeAllActiveSessions(UUID staffId) {

        return authSessionsRepository
                .revokeAllActiveSessionsByStaffId(staffId);
    }
}
