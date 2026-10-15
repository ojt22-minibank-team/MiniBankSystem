package com.corebanking.security.audit.specification;

import com.corebanking.entity.AuditLogs;
import com.corebanking.security.audit.dto.AuditSearchCriteria;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic JPA Specification builder for filtering {@link AuditLogs}.
 */
public final class AuditSearchSpecification {

    private AuditSearchSpecification() {
        // Utility specification class
    }

    /**
     * Build dynamic JPA Specification from user-supplied {@link AuditSearchCriteria}.
     *
     * @param criteria search criteria filter values
     * @return Specification instance for repository query execution
     */
    public static Specification<AuditLogs> build(AuditSearchCriteria criteria) {
        return (root, query, cb) -> {
            if (criteria == null) {
                return cb.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getStaffId() != null) {
                predicates.add(cb.equal(root.get("actorStaff").get("staffId"), criteria.getStaffId()));
            }

            if (criteria.getStaffUsername() != null && !criteria.getStaffUsername().isBlank()) {
                Predicate byUsername = cb.equal(root.get("actorStaff").get("username"), criteria.getStaffUsername());
                Predicate byStaffNo = cb.equal(root.get("actorStaff").get("staffNo"), criteria.getStaffUsername());
                predicates.add(cb.or(byUsername, byStaffNo));
            }

            if (criteria.getCustomerId() != null) {
                predicates.add(cb.equal(root.get("actorCustomer").get("customerId"), criteria.getCustomerId()));
            }

            if (criteria.getActorType() != null) {
                predicates.add(cb.equal(root.get("actorType"), criteria.getActorType()));
            }

            if (criteria.getActionCategory() != null && !criteria.getActionCategory().isBlank()) {
                predicates.add(cb.equal(root.get("actionCategory"), criteria.getActionCategory().trim()));
            }

            if (criteria.getActionType() != null && !criteria.getActionType().isBlank()) {
                predicates.add(cb.equal(root.get("actionType"), criteria.getActionType().trim()));
            }

            if (criteria.getEntityType() != null && !criteria.getEntityType().isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), criteria.getEntityType().trim()));
            }

            if (criteria.getEntityId() != null && !criteria.getEntityId().isBlank()) {
                predicates.add(cb.equal(root.get("entityId"), criteria.getEntityId().trim()));
            }

            if (criteria.getIpAddress() != null && !criteria.getIpAddress().isBlank()) {
                predicates.add(cb.equal(root.get("ipAddress"), criteria.getIpAddress().trim()));
            }

            if (criteria.getStartDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), criteria.getStartDate()));
            }

            if (criteria.getEndDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), criteria.getEndDate()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
