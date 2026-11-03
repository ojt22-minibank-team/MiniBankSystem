package com.corebanking.repository;

import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffOtpChallengesRepository extends JpaRepository<OtpChallenge, Long> {

    List<OtpChallenge> findByStaffAndSubjectTypeAndPurposeAndStatus(
            StaffUsers staff,
            OtpSubjectType subjectType,
            OtpPurpose purpose,
            OtpStatus status
    );

    @EntityGraph(attributePaths = {"staff"})
    Optional<OtpChallenge> findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
            String challengeGroupId,
            OtpSubjectType subjectType,
            OtpPurpose purpose
    );
}
