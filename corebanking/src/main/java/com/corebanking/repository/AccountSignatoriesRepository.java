package com.corebanking.repository;

import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.enums.SignatoryRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountSignatoriesRepository extends JpaRepository<AccountSignatories, UUID> {

    // နည်းလမ်း ၁: JPQL @Query အသုံးပြုခြင်း (Naming error လုံးဝ ကင်းဝေးစေပါသည်)
    @Query("SELECT s FROM AccountSignatories s WHERE s.account.accountNumber = :accountNumber")
    List<AccountSignatories> findByAccountNumber(@Param("accountNumber") String accountNumber);

    @Query("SELECT s FROM AccountSignatories s " +
           "WHERE s.account.accountNumber = :accountNumber " +
           "AND s.customer.customerCode = :customerCode " +
           "AND s.signatoryRole = :role")
    Optional<AccountSignatories> findByAccountNumberAndCustomerCodeAndRole(
            @Param("accountNumber") String accountNumber,
            @Param("customerCode") String customerCode,
            @Param("role") SignatoryRole role
    );

    // နည်းလမ်း ၂: Spring Data JPA Derived Method သုံးလိုပါက Underscore (_) ခံ၍ ရေးရပါမည်
    List<AccountSignatories> findByAccount_AccountNumber(String accountNumber);
}