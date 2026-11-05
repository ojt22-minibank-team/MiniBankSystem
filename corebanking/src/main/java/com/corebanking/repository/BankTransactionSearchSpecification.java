package com.corebanking.repository;

import com.corebanking.dto.StaffTransactionSearchCriteria;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.TransactionChannel;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic JPA Specification builder for high-performance staff transaction searches.
 */
public final class BankTransactionSearchSpecification {

    private BankTransactionSearchSpecification() {
        // Utility specification class
    }

    public static Specification<BankTransactions> build(StaffTransactionSearchCriteria criteria) {
        return (root, query, cb) -> {
            if (criteria == null) {
                return cb.conjunction();
            }

            List<Predicate> predicates = new ArrayList<>();

            // 1. Text Search across Ref, Accounts, and Customer names
            if (criteria.getSearch() != null && !criteria.getSearch().trim().isEmpty()) {
                String searchPattern = "%" + criteria.getSearch().trim().toLowerCase() + "%";

                Join<BankTransactions, Accounts> srcAcc = root.join("sourceAccount", JoinType.LEFT);
                Join<Accounts, Customers> srcCust = srcAcc.join("customer", JoinType.LEFT);

                Join<BankTransactions, Accounts> destAcc = root.join("destinationAccount", JoinType.LEFT);
                Join<Accounts, Customers> destCust = destAcc.join("customer", JoinType.LEFT);

                Predicate refMatch = cb.like(cb.lower(root.get("transactionRef")), searchPattern);
                Predicate extRefMatch = cb.like(cb.lower(root.get("externalReference")), searchPattern);
                Predicate srcAccMatch = cb.like(cb.lower(srcAcc.get("accountNumber")), searchPattern);
                Predicate destAccMatch = cb.like(cb.lower(destAcc.get("accountNumber")), searchPattern);
                Predicate srcCustMatch = cb.like(cb.lower(srcCust.get("fullName")), searchPattern);
                Predicate destCustMatch = cb.like(cb.lower(destCust.get("fullName")), searchPattern);

                predicates.add(cb.or(refMatch, extRefMatch, srcAccMatch, destAccMatch, srcCustMatch, destCustMatch));
            }

            // 2. Status filter
            if (criteria.getStatus() != null && !criteria.getStatus().trim().isEmpty() && !criteria.getStatus().equalsIgnoreCase("ALL")) {
                try {
                    TransactionStatus statusEnum = TransactionStatus.valueOf(criteria.getStatus().trim().toUpperCase());
                    predicates.add(cb.equal(root.get("status"), statusEnum));
                } catch (IllegalArgumentException ignored) {}
            }

            // 3. Transaction Type filter
            if (criteria.getTransactionType() != null && !criteria.getTransactionType().trim().isEmpty() && !criteria.getTransactionType().equalsIgnoreCase("ALL")) {
                try {
                    TransactionType typeEnum = TransactionType.valueOf(criteria.getTransactionType().trim().toUpperCase());
                    predicates.add(cb.equal(root.get("transactionType"), typeEnum));
                } catch (IllegalArgumentException ignored) {}
            }

            // 4. Channel filter
            if (criteria.getChannel() != null && !criteria.getChannel().trim().isEmpty() && !criteria.getChannel().equalsIgnoreCase("ALL")) {
                try {
                    TransactionChannel channelEnum = TransactionChannel.valueOf(criteria.getChannel().trim().toUpperCase());
                    predicates.add(cb.equal(root.get("channel"), channelEnum));
                } catch (IllegalArgumentException ignored) {}
            }

            // 5. Date range filters (based on initiatedAt)
            if (criteria.getStartDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("initiatedAt"), criteria.getStartDate()));
            }
            if (criteria.getEndDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("initiatedAt"), criteria.getEndDate()));
            }

            // 6. Amount bounds
            if (criteria.getMinAmount() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), criteria.getMinAmount()));
            }
            if (criteria.getMaxAmount() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("amount"), criteria.getMaxAmount()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
