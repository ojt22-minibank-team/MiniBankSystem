package com.corebanking.service;

import com.corebanking.dto.StaffChangePasswordRequest;
import com.corebanking.dto.StaffResponse;
import com.corebanking.dto.StaffUpdateRequest;
import com.corebanking.entity.Roles;
import com.corebanking.entity.StaffUserRoles;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUserRolesRepository;
import com.corebanking.repository.StaffUsersRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Profile Service Unit Tests")
class StaffProfileServiceTest {

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @Mock
    private StaffUserRolesRepository staffUserRolesRepository;

    @Mock
    private RolesRepository rolesRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthSessionsRepository authSessionsRepository;

    @Mock
    private AuditTrailService auditTrailService;

    @InjectMocks
    private StaffManagementService staffManagementService;

    private StaffUsers sampleStaff;
    private static final UUID SAMPLE_STAFF_ID = UUID.fromString("11111111-2222-3333-4444-555555555555");
    private static final String SAMPLE_USERNAME = "teller_kyaw";
    private static final String ENCODED_OLD_PASS = "$2a$10$encodedOldPassHash";
    private static final String ENCODED_NEW_PASS = "$2a$10$encodedNewPassHash";

    @BeforeEach
    void setUp() {
        sampleStaff = StaffUsers.builder()
                .staffId(SAMPLE_STAFF_ID)
                .staffNo("STF-2026-009")
                .username(SAMPLE_USERNAME)
                .fullName("Kyaw Kyaw")
                .email("kyaw@bank.com")
                .phone("09123456789")
                .passwordHash(ENCODED_OLD_PASS)
                .status(StaffUserStatus.ACTIVE)
                .tokenVersion(1)
                .mustChangePassword(true)
                .failedLoginCount(2)
                .lockedUntil(LocalDateTime.now().plusMinutes(10))
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthentication(String username) {
        var auth = new UsernamePasswordAuthenticationToken(
                username,
                "credentials",
                List.of(new SimpleGrantedAuthority("ROLE_TELLER"))
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
    }

    @Nested
    @DisplayName("getMyProfile Tests")
    class GetMyProfileTests {

        @Test
        @DisplayName("Should return StaffResponse when authenticated staff is found")
        void getMyProfile_success() {
            // Arrange
            mockAuthentication(SAMPLE_USERNAME);
            when(staffUsersRepository.findByUsername(SAMPLE_USERNAME)).thenReturn(Optional.of(sampleStaff));

            Roles role = new Roles();
            role.setRoleId(2);
            role.setRoleCode("ROLE_TELLER");
            role.setRoleName("Teller");

            StaffUserRoles staffUserRole = new StaffUserRoles();
            staffUserRole.setRoleId(2);
            staffUserRole.setRole(role);
            when(staffUserRolesRepository.findByStaffId(SAMPLE_STAFF_ID)).thenReturn(Optional.of(staffUserRole));
            when(rolesRepository.findById(2)).thenReturn(Optional.of(role));

            // Act
            StaffResponse response = staffManagementService.getMyProfile();

            // Assert
            assertThat(response).isNotNull();
            assertThat(response.getStaffId()).isEqualTo(SAMPLE_STAFF_ID);
            assertThat(response.getUsername()).isEqualTo(SAMPLE_USERNAME);
            assertThat(response.getFullName()).isEqualTo("Kyaw Kyaw");
            assertThat(response.getRoleCode()).isEqualTo("ROLE_TELLER");
            verify(staffUsersRepository).findByUsername(SAMPLE_USERNAME);
        }

        @Test
        @DisplayName("Should throw RuntimeException when authenticated staff is not found in database")
        void getMyProfile_notFound_throwsException() {
            // Arrange
            mockAuthentication("unknown_user");
            when(staffUsersRepository.findByUsername("unknown_user")).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.getMyProfile())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Authenticated staff record not found");
        }

        @Test
        @DisplayName("Should throw RuntimeException when user is not authenticated")
        void getMyProfile_unauthenticated_throwsException() {
            // Arrange
            SecurityContextHolder.clearContext();

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.getMyProfile())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Authenticated staff record not found");
        }
    }

    @Nested
    @DisplayName("updateMyProfile Tests")
    class UpdateMyProfileTests {

        @Test
        @DisplayName("Should throw RuntimeException when authenticated staff is not found")
        void updateMyProfile_notFound_throwsException() {
            // Arrange
            mockAuthentication("nonexistent");
            when(staffUsersRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

            StaffUpdateRequest request = new StaffUpdateRequest();
            request.setFullName("Updated Name");

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.updateMyProfile(request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Authenticated staff record not found");
        }

        @Test
        @DisplayName("Should update staff profile successfully when authenticated")
        void updateMyProfile_success() {
            // Arrange
            mockAuthentication(SAMPLE_USERNAME);
            when(staffUsersRepository.findByUsername(SAMPLE_USERNAME)).thenReturn(Optional.of(sampleStaff));
            when(staffUsersRepository.findById(SAMPLE_STAFF_ID)).thenReturn(Optional.of(sampleStaff));
            when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(invocation -> invocation.getArgument(0));

            Roles role = new Roles();
            role.setRoleId(1);
            role.setRoleCode("ROLE_TELLER");
            role.setRoleName("Teller");
            StaffUserRoles staffUserRole = new StaffUserRoles();
            staffUserRole.setRoleId(1);
            staffUserRole.setRole(role);
            when(staffUserRolesRepository.findByStaffId(SAMPLE_STAFF_ID)).thenReturn(Optional.of(staffUserRole));
            when(rolesRepository.findById(1)).thenReturn(Optional.of(role));

            StaffUpdateRequest request = new StaffUpdateRequest();
            request.setFullName("Kyaw Kyaw Updated");
            request.setEmail("kyaw_updated@bank.com");
            request.setPhone("09977112233");

            // Act
            StaffResponse response = staffManagementService.updateMyProfile(request);

            // Assert
            assertThat(response).isNotNull();
            assertThat(sampleStaff.getFullName()).isEqualTo("Kyaw Kyaw Updated");
            assertThat(sampleStaff.getEmail()).isEqualTo("kyaw_updated@bank.com");
            assertThat(sampleStaff.getPhone()).isEqualTo("09977112233");
            verify(staffUsersRepository).save(sampleStaff);
        }
    }

    @Nested
    @DisplayName("changeMyPassword Tests")
    class ChangeMyPasswordTests {

        @Test
        @DisplayName("Should change password successfully, clear lockout flags and log audit")
        void changeMyPassword_success() {
            // Arrange
            mockAuthentication(SAMPLE_USERNAME);
            when(staffUsersRepository.findByUsername(SAMPLE_USERNAME)).thenReturn(Optional.of(sampleStaff));

            StaffChangePasswordRequest request = new StaffChangePasswordRequest(
                    "CurrentPass123!",
                    "BrandNewPass123!",
                    "BrandNewPass123!"
            );

            when(passwordEncoder.matches("CurrentPass123!", ENCODED_OLD_PASS)).thenReturn(true);
            when(passwordEncoder.matches("BrandNewPass123!", ENCODED_OLD_PASS)).thenReturn(false);
            when(passwordEncoder.encode("BrandNewPass123!")).thenReturn(ENCODED_NEW_PASS);

            // Act
            staffManagementService.changeMyPassword(request);

            // Assert
            assertThat(sampleStaff.getPasswordHash()).isEqualTo(ENCODED_NEW_PASS);
            assertThat(sampleStaff.isMustChangePassword()).isFalse();
            assertThat(sampleStaff.getPasswordChangedAt()).isNotNull();
            assertThat(sampleStaff.getFailedLoginCount()).isEqualTo(0);
            assertThat(sampleStaff.getLockedUntil()).isNull();
            assertThat(sampleStaff.getTokenVersion()).isEqualTo(2);

            verify(staffUsersRepository).save(sampleStaff);
            verify(auditTrailService).logActivity(
                    eq("SECURITY"),
                    eq("CHANGE_PASSWORD"),
                    eq("STAFF_USER"),
                    eq(sampleStaff.getStaffNo()),
                    contains("Staff successfully changed own password: " + SAMPLE_USERNAME)
            );
        }

        @Test
        @DisplayName("Should throw RuntimeException when authenticated staff is not found")
        void changeMyPassword_unauthenticated_throwsException() {
            // Arrange
            SecurityContextHolder.clearContext();
            StaffChangePasswordRequest request = new StaffChangePasswordRequest("cur", "newPass123!", "newPass123!");

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.changeMyPassword(request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Authenticated staff record not found");
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when current password does not match")
        void changeMyPassword_wrongCurrentPassword_throwsException() {
            // Arrange
            mockAuthentication(SAMPLE_USERNAME);
            when(staffUsersRepository.findByUsername(SAMPLE_USERNAME)).thenReturn(Optional.of(sampleStaff));

            StaffChangePasswordRequest request = new StaffChangePasswordRequest(
                    "WrongOldPass!",
                    "BrandNewPass123!",
                    "BrandNewPass123!"
            );
            when(passwordEncoder.matches("WrongOldPass!", ENCODED_OLD_PASS)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.changeMyPassword(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Current password is incorrect");

            verify(staffUsersRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when new password is less than 8 characters")
        void changeMyPassword_shortNewPassword_throwsException() {
            // Arrange
            mockAuthentication(SAMPLE_USERNAME);
            when(staffUsersRepository.findByUsername(SAMPLE_USERNAME)).thenReturn(Optional.of(sampleStaff));

            StaffChangePasswordRequest request = new StaffChangePasswordRequest(
                    "CurrentPass123!",
                    "short",
                    "short"
            );
            when(passwordEncoder.matches("CurrentPass123!", ENCODED_OLD_PASS)).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.changeMyPassword(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("New password must be at least 8 characters");

            verify(staffUsersRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when confirm password does not match new password")
        void changeMyPassword_confirmationMismatch_throwsException() {
            // Arrange
            mockAuthentication(SAMPLE_USERNAME);
            when(staffUsersRepository.findByUsername(SAMPLE_USERNAME)).thenReturn(Optional.of(sampleStaff));

            StaffChangePasswordRequest request = new StaffChangePasswordRequest(
                    "CurrentPass123!",
                    "BrandNewPass123!",
                    "DifferentPass123!"
            );
            when(passwordEncoder.matches("CurrentPass123!", ENCODED_OLD_PASS)).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.changeMyPassword(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("New password and confirmation do not match");

            verify(staffUsersRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when new password matches current password")
        void changeMyPassword_sameAsOldPassword_throwsException() {
            // Arrange
            mockAuthentication(SAMPLE_USERNAME);
            when(staffUsersRepository.findByUsername(SAMPLE_USERNAME)).thenReturn(Optional.of(sampleStaff));

            StaffChangePasswordRequest request = new StaffChangePasswordRequest(
                    "CurrentPass123!",
                    "CurrentPass123!",
                    "CurrentPass123!"
            );
            when(passwordEncoder.matches("CurrentPass123!", ENCODED_OLD_PASS)).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> staffManagementService.changeMyPassword(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("New password cannot be the same as your current password");

            verify(staffUsersRepository, never()).save(any());
        }
    }
}
