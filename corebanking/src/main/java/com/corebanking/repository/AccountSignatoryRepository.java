package com.corebanking.repository;

import com.corebanking.entity.AccountSignatory;
import com.corebanking.entity.enums.SignatoryRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountSignatoryRepository extends JpaRepository<AccountSignatory, Long> {

    // အကောင့်တစ်ခုတွင် တာဝန်ယူထားသူများအားလုံးကို ရှာဖွေခြင်း
    List<AccountSignatory> findByAccountNumber(String accountNumber);

    // လူတစ်ယောက်သည် ထိုအကောင့်တွင် သတ်မှတ်ထားသော Role အမှန်တကယ် ဟုတ်မဟုတ် စစ်ဆေးခြင်း
    Optional<AccountSignatory> findByAccountNumberAndCustomerCodeAndRole(
            String accountNumber, String customerCode, SignatoryRole role);
}