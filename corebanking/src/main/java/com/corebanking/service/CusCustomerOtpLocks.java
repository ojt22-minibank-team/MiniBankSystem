package com.corebanking.service;

import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpSubjectType;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusOtpException;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.util.UUID;

/**
 * Reset lock order: customer credential -> flush pending caller changes ->
 * shared current owner read -> latest customer/purpose OTP -> claim and writes.
 * Credential reloading reuses the lock already held. LOGIN retains credential -> current original
 * -> requested latest OTP. All competing reset starts/resends/verifications and
 * completions use the same credential row; the OTP row may change on resend.
 * Locking reads are current reads under InnoDB REPEATABLE READ. Evict only the
 * locked authentication entities: a REQUIRED caller may own unrelated pending
 * changes, so clearing the entire persistence context is unsafe. After the
 * credential lock, flush before scoped detachment: Customers cascades DETACH
 * to profile entities whose pending changes do not overlap the locking query.
 * This flush joins the caller's transaction; it neither commits nor releases
 * locks, and all flushed changes still roll back with that transaction.
 * DB locks survive detachment. Fresh find(..., lock) emits an actual current
 * read; Hibernate refresh on an already locked entity can omit its lock clause.
 */
public final class CusCustomerOtpLocks {
    private CusCustomerOtpLocks() { }

    public static CustomerCredentials lockCustomer(EntityManager em, CusCredentialsRepository credentials, UUID id) {
        CustomerCredentials locked = credentials.findByCustomerIdForUpdate(id)
                .orElseThrow(() -> new CusAuthenticationException("Invalid customer credentials."));
        if (locked.getCustomer() == null || !id.equals(locked.getCustomer().getCustomerId())) {
            throw new CusOtpException("Invalid customer OTP challenge.");
        }
        em.flush();
        Customers owner = locked.getCustomer();
        em.detach(locked);
        em.detach(owner);
        // A shared owner lock is compatible with audit/blacklist FK checks.
        // Credential ownership remains exclusively locked until commit.
        Customers currentOwner = em.find(Customers.class, id, LockModeType.PESSIMISTIC_READ);
        CustomerCredentials current = em.find(CustomerCredentials.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (currentOwner == null || current == null || current.getCustomer() == null
                || !id.equals(current.getCustomer().getCustomerId())) {
            throw new CusAuthenticationException("Invalid customer credentials.");
        }
        return current;
    }

    public static OtpChallenge lockRequested(EntityManager em, CusCredentialsRepository credentials,
                                             CusOtpChallengesRepository otps, String group, OtpPurpose purpose) {
        // Provisional identity only: neither this entity nor its state authorizes anything.
        OtpChallenge provisional = otps.findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(group, purpose)
                .orElseThrow(() -> new CusOtpException("Invalid reset challenge."));
        if (provisional.getCustomer() == null || provisional.getCustomer().getCustomerId() == null
                || provisional.getCorporateUser() != null || provisional.getSubjectType() != OtpSubjectType.CUSTOMER) {
            throw new CusOtpException("Invalid customer reset challenge.");
        }
        UUID id = provisional.getCustomer().getCustomerId();
        return current(em, otps, lockCustomer(em, credentials, id), group, purpose);
    }

    public static OtpChallenge current(EntityManager em, CusOtpChallengesRepository otps, CustomerCredentials locked,
                                       String group, OtpPurpose purpose) {
        UUID id = locked.getCustomerId();
        OtpChallenge latest = otps.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                id, OtpSubjectType.CUSTOMER, purpose)
                .orElseThrow(() -> new CusOtpException("Invalid reset challenge."));
        // The provisional group lookup can have cached this very row. Evict
        // only it after the locking query has flushed overlapping OTP changes.
        Long otpId = latest.getOtpId();
        em.detach(latest);
        latest = em.find(OtpChallenge.class, otpId, LockModeType.PESSIMISTIC_WRITE);
        if (latest == null) throw new CusOtpException("Invalid reset challenge.");
        // Use the latest row for this owner and purpose, irrespective of its
        // status/group. Rotation leaves historical rows behind under the old ID.
        if (!group.equals(latest.getChallengeGroupId()) || latest.getCustomer() == null
                || !id.equals(latest.getCustomer().getCustomerId()) || latest.getCorporateUser() != null
                || latest.getSubjectType() != OtpSubjectType.CUSTOMER || latest.getPurpose() != purpose) {
            throw new CusOtpException("This reset challenge has been superseded or already used.");
        }
        return latest;
    }

    /** Identity extraction only; the original session validator still runs after the lock. */
    public static UUID customerSubject(String subject) {
        try { return UUID.fromString(subject); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new CusAuthenticationException("Invalid authentication token.");
        }
    }
}
