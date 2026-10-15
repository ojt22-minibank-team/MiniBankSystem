package com.corebanking.repository;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AccountStatusSummaryDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.BalanceBracketDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * ReportRepository ? Group 2 Reporting Subsystem.
 * Ledger and Account Status queries execute via MySQL Stored Procedures,
 * while Audit Trail queries use the modernized immutable AuditLogs JPA Entity.
 */
@Repository
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AuditLogsRepository auditLogsRepository;

    public ReportRepository(JdbcTemplate jdbcTemplate, AuditLogsRepository auditLogsRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditLogsRepository = auditLogsRepository;
    }

    // -------------------------------------------------------
    // SP 1: Daily Ledger Summary
    // -------------------------------------------------------
    public List<DailyLedgerSummaryDTO> getDailyLedgerSummary(
            LocalDate startDate, LocalDate endDate, String status) {

        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{CALL sp_get_daily_ledger_summary(?, ?, ?)}");
            cs.setObject(1, startDate);
            cs.setObject(2, endDate);
            cs.setString(3, (status == null || status.isBlank()) ? null : status);
            return cs;
        }, (CallableStatement cs) -> {
            List<DailyLedgerSummaryDTO> result = new ArrayList<>();
            boolean hasRs = cs.execute();
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        result.add(DailyLedgerSummaryDTO.builder()
                                .reportDate(rs.getObject("report_date", LocalDate.class))
                                .transactionType(rs.getString("transaction_type"))
                                .transactionCount(rs.getLong("transaction_count"))
                                .totalAmount(rs.getBigDecimal("total_amount"))
                                .totalFee(rs.getBigDecimal("total_fee"))
                                .currency(rs.getString("currency"))
                                .build());
                    }
                }
            }
            return result;
        });
    }

    // -------------------------------------------------------
    // SP 2: Account Status Summary
    // -------------------------------------------------------
    public AccountStatusReportDTO getAccountStatusSummary(
            LocalDate startDate, LocalDate endDate, String accountStatus) {

        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{CALL sp_get_customer_account_status_summary(?, ?, ?)}");
            cs.setObject(1, startDate);
            cs.setObject(2, endDate);
            cs.setString(3, (accountStatus == null || accountStatus.isBlank()) ? null : accountStatus);
            return cs;
        }, (CallableStatement cs) -> {
            List<AccountStatusSummaryDTO> statuses = new ArrayList<>();
            List<BalanceBracketDTO> brackets = new ArrayList<>();

            boolean hasRs = cs.execute();

            // RS1: status breakdown
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        statuses.add(AccountStatusSummaryDTO.builder()
                                .accountStatus(rs.getString("account_status"))
                                .accountCount(rs.getLong("account_count"))
                                .newAccountsInRange(rs.getLong("new_accounts_in_range"))
                                .avgBalance(rs.getBigDecimal("avg_balance"))
                                .minBalance(rs.getBigDecimal("min_balance"))
                                .maxBalance(rs.getBigDecimal("max_balance"))
                                .build());
                    }
                }
                hasRs = cs.getMoreResults();
            }

            // RS2: bracket distribution
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        brackets.add(BalanceBracketDTO.builder()
                                .balanceBracket(rs.getString("balance_bracket"))
                                .bracketCount(rs.getLong("bracket_count"))
                                .bracketTotalBalance(rs.getBigDecimal("bracket_total_balance"))
                                .accountStatus(rs.getString("account_status"))
                                .build());
                    }
                }
            }

            return AccountStatusReportDTO.builder()
                    .statusSummaries(statuses)
                    .bracketDistribution(brackets)
                    .build();
        });
    }

    // -------------------------------------------------------
    // Audit Trail Log (paginated via AuditLogs entity)
    // -------------------------------------------------------
    @Transactional(readOnly = true)
    public AuditTrailPageDTO getAuditTrailLog(
            String staffId, String actionType,
            LocalDateTime startDate, LocalDateTime endDate,
            String accountNo, int page, int pageSize) {

        int validPage = (page <= 0) ? 1 : page;
        int validPageSize = (pageSize <= 0) ? 20 : pageSize;
        Pageable pageable = PageRequest.of(validPage - 1, validPageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<AuditLogs> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (staffId != null && !staffId.isBlank()) {
                String trimmed = staffId.trim();
                Join<AuditLogs, StaffUsers> staffJoin = root.join("actorStaff", JoinType.LEFT);
                Join<AuditLogs, Customers> customerJoin = root.join("actorCustomer", JoinType.LEFT);
                Join<AuditLogs, CorporateUser> corpJoin = root.join("actorCorporateUser", JoinType.LEFT);

                List<Predicate> actorPreds = new ArrayList<>();
                actorPreds.add(cb.equal(staffJoin.get("staffNo"), trimmed));
                actorPreds.add(cb.equal(staffJoin.get("username"), trimmed));
                actorPreds.add(cb.equal(customerJoin.get("customerCode"), trimmed));
                actorPreds.add(cb.equal(customerJoin.get("email"), trimmed));
                actorPreds.add(cb.equal(corpJoin.get("corporateUserCode"), trimmed));
                actorPreds.add(cb.equal(corpJoin.get("email"), trimmed));
                actorPreds.add(cb.equal(root.get("requestId"), trimmed));

                try {
                    UUID uuid = UUID.fromString(trimmed);
                    actorPreds.add(cb.equal(staffJoin.get("staffId"), uuid));
                    actorPreds.add(cb.equal(customerJoin.get("customerId"), uuid));
                    actorPreds.add(cb.equal(corpJoin.get("corporateUserId"), uuid));
                } catch (IllegalArgumentException ignored) {
                }

                predicates.add(cb.or(actorPreds.toArray(new Predicate[0])));
            }

            if (actionType != null && !actionType.isBlank()) {
                predicates.add(cb.equal(root.get("actionType"), actionType.trim()));
            }

            if (accountNo != null && !accountNo.isBlank()) {
                predicates.add(cb.equal(root.get("entityId"), accountNo.trim()));
            }

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }

            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditLogs> pageResult = auditLogsRepository.findAll(spec, pageable);

        List<AuditTrailLogDTO> logs = pageResult.getContent().stream()
                .map(this::mapToAuditTrailLogDTO)
                .toList();

        return AuditTrailPageDTO.builder()
                .logs(logs)
                .totalCount(pageResult.getTotalElements())
                .page(validPage)
                .pageSize(validPageSize)
                .totalPages(pageResult.getTotalPages())
                .build();
    }

    private AuditTrailLogDTO mapToAuditTrailLogDTO(AuditLogs al) {
        String staffId = "";
        String staffUsername = "";
        String staffFullName = "";

        if (al.getActorStaff() != null) {
            staffId = (al.getActorStaff().getStaffNo() != null) ? al.getActorStaff().getStaffNo() : "";
            staffUsername = (al.getActorStaff().getUsername() != null) ? al.getActorStaff().getUsername() : "";
            staffFullName = (al.getActorStaff().getFullName() != null) ? al.getActorStaff().getFullName() : "";
        } else if (al.getActorCustomer() != null) {
            staffId = (al.getActorCustomer().getCustomerCode() != null) ? al.getActorCustomer().getCustomerCode() : "";
            staffUsername = (al.getActorCustomer().getEmail() != null) ? al.getActorCustomer().getEmail() : "";
            staffFullName = (al.getActorCustomer().getFullName() != null) ? al.getActorCustomer().getFullName() : "";
        } else if (al.getActorCorporateUser() != null) {
            staffId = (al.getActorCorporateUser().getCorporateUserCode() != null) ? al.getActorCorporateUser().getCorporateUserCode() : "";
            staffUsername = (al.getActorCorporateUser().getEmail() != null) ? al.getActorCorporateUser().getEmail() : "";
            staffFullName = (al.getActorCorporateUser().getFullName() != null) ? al.getActorCorporateUser().getFullName() : "";
        } else if (al.getRequestId() != null) {
            staffId = al.getRequestId();
        }

        String description = al.getDescription();
        if ((description == null || description.isBlank()) && al.getUserAgent() != null) {
            description = al.getUserAgent();
        }

        return AuditTrailLogDTO.builder()
                .logId(al.getAuditId() != null ? String.valueOf(al.getAuditId()) : "")
                .actorType(al.getActorType() != null ? al.getActorType().name() : "")
                .actionCategory(al.getActionCategory() != null ? al.getActionCategory() : "")
                .staffId(staffId)
                .staffUsername(staffUsername)
                .staffFullName(staffFullName)
                .actionType(al.getActionType() != null ? al.getActionType() : "")
                .entityType(al.getEntityType() != null ? al.getEntityType() : "")
                .entityId(al.getEntityId() != null ? al.getEntityId() : "")
                .oldValue(al.getOldValues())
                .newValue(al.getNewValues())
                .ipAddress(al.getIpAddress())
                .description(description != null ? description : "")
                .createdAt(al.getCreatedAt())
                .build();
    }
}
