package com.corebanking.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.corebanking.entity.Customers;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.corebanking.entity.enums.UpdatedByType;
public interface CusOtpChallengesRepository
        extends JpaRepository<OtpChallenge, Long> {
	List<OtpChallenge> findByCustomerAndPurposeAndStatus(
            Customers customer,
            OtpPurpose purpose,
            OtpStatus status
    );
	@EntityGraph(attributePaths = "customer")
	Optional<OtpChallenge>
	findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
	        String challengeGroupId,
	        OtpPurpose purpose
	);
	// =========================================================
	// ATOMIC PASSWORD RESET OTP CONSUME
	// =========================================================
	//
	// Correct OTP ကို request ၂ခု တပြိုင်နက် verify လုပ်ရင်
	// request တစ်ခုတည်းက ACTIVE -> CONSUMED ပြောင်းနိုင်မယ်.
	//
	// Success ဖြစ်တဲ့အချိန် challengeGroupId ကိုလည်း
	// random UUID အသစ်နဲ့ rotate လုပ်မယ်.
	// =========================================================

	@Modifying(
	        flushAutomatically = true
	)
	@Query("""
	        UPDATE OtpChallenge o
	           SET o.status = :consumedStatus,
	               o.consumedAt = :consumedAt,
	               o.challengeGroupId = :newChallengeGroupId,
	               o.updatedByType = :updatedByType,
	               o.updatedById = :updatedById,
	               o.updatedAt = :updatedAt
	         WHERE o.otpId = :otpId
	           AND o.challengeGroupId = :expectedChallengeGroupId
	           AND o.purpose = :purpose
	           AND o.status = :activeStatus
	           AND o.expiresAt > :now
	           AND o.attemptCount < o.maxAttempts
	        """)
	int consumePasswordResetOtpIfActive(

	        @Param("otpId")
	        Long otpId,

	        @Param("expectedChallengeGroupId")
	        String expectedChallengeGroupId,

	        @Param("purpose")
	        OtpPurpose purpose,

	        @Param("activeStatus")
	        OtpStatus activeStatus,

	        @Param("consumedStatus")
	        OtpStatus consumedStatus,

	        @Param("newChallengeGroupId")
	        String newChallengeGroupId,

	        @Param("consumedAt")
	        LocalDateTime consumedAt,

	        @Param("now")
	        LocalDateTime now,

	        @Param("updatedByType")
	        UpdatedByType updatedByType,

	        @Param("updatedById")
	        UUID updatedById,

	        @Param("updatedAt")
	        LocalDateTime updatedAt
	);
	
	@Modifying(
	        flushAutomatically = true,
	        clearAutomatically = true
	)
	@Query("""
	        UPDATE OtpChallenge o
	           SET o.challengeGroupId = :newChallengeGroupId,
	               o.updatedByType = :updatedByType,
	               o.updatedById = :updatedById,
	               o.updatedAt = :now
	         WHERE o.otpId = :otpId
	           AND o.challengeGroupId = :expectedChallengeGroupId
	           AND o.purpose = :purpose
	           AND o.status = :status
	           AND o.consumedAt IS NOT NULL
	        """)
	int claimVerifiedPasswordResetChallengeIfMatch(

	        @Param("otpId")
	        Long otpId,

	        @Param("expectedChallengeGroupId")
	        String expectedChallengeGroupId,

	        @Param("newChallengeGroupId")
	        String newChallengeGroupId,

	        @Param("purpose")
	        OtpPurpose purpose,

	        @Param("status")
	        OtpStatus status,

	        @Param("updatedByType")
	        UpdatedByType updatedByType,

	        @Param("updatedById")
	        UUID updatedById,

	        @Param("now")
	        LocalDateTime now
	);
	// =========================================================
	// ATOMIC PIN RESET OTP CONSUME
	// =========================================================

	@Modifying(
	        flushAutomatically = true
	)
	@Query("""
	        UPDATE OtpChallenge o
	           SET o.status = :consumedStatus,
	               o.consumedAt = :consumedAt,
	               o.challengeGroupId = :newChallengeGroupId,
	               o.updatedByType = :updatedByType,
	               o.updatedById = :updatedById,
	               o.updatedAt = :updatedAt
	         WHERE o.otpId = :otpId
	           AND o.challengeGroupId = :expectedChallengeGroupId
	           AND o.purpose = :purpose
	           AND o.status = :activeStatus
	           AND o.expiresAt > :now
	           AND o.attemptCount < o.maxAttempts
	        """)
	int consumePinResetOtpIfActive(

	        @Param("otpId")
	        Long otpId,

	        @Param("expectedChallengeGroupId")
	        String expectedChallengeGroupId,

	        @Param("purpose")
	        OtpPurpose purpose,

	        @Param("activeStatus")
	        OtpStatus activeStatus,

	        @Param("consumedStatus")
	        OtpStatus consumedStatus,

	        @Param("newChallengeGroupId")
	        String newChallengeGroupId,

	        @Param("consumedAt")
	        LocalDateTime consumedAt,

	        @Param("now")
	        LocalDateTime now,

	        @Param("updatedByType")
	        UpdatedByType updatedByType,

	        @Param("updatedById")
	        UUID updatedById,

	        @Param("updatedAt")
	        LocalDateTime updatedAt
	);
	// =========================================================
	// CLAIM VERIFIED PIN RESET CHALLENGE - ONE TIME USE
	// =========================================================

	@Modifying(
	        flushAutomatically = true,
	        clearAutomatically = true
	)
	@Query("""
	        UPDATE OtpChallenge o
	           SET o.challengeGroupId = :newChallengeGroupId,
	               o.updatedByType = :updatedByType,
	               o.updatedById = :updatedById,
	               o.updatedAt = :now
	         WHERE o.otpId = :otpId
	           AND o.challengeGroupId = :expectedChallengeGroupId
	           AND o.purpose = :purpose
	           AND o.status = :status
	           AND o.consumedAt IS NOT NULL
	        """)
	int claimVerifiedPinResetChallengeIfMatch(

	        @Param("otpId")
	        Long otpId,

	        @Param("expectedChallengeGroupId")
	        String expectedChallengeGroupId,

	        @Param("newChallengeGroupId")
	        String newChallengeGroupId,

	        @Param("purpose")
	        OtpPurpose purpose,

	        @Param("status")
	        OtpStatus status,

	        @Param("updatedByType")
	        UpdatedByType updatedByType,

	        @Param("updatedById")
	        UUID updatedById,

	        @Param("now")
	        LocalDateTime now
	);
	
}