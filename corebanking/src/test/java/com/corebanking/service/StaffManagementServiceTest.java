package com.corebanking.service;

import com.corebanking.dto.ChangeStaffRoleRequest;
import com.corebanking.dto.PasswordResetRequest;
import com.corebanking.dto.StaffCreateRequest;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Management Unit Tests - StaffManagementService")
class StaffManagementServiceTest {

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

    @InjectMocks
    private StaffManagementService staffManagementService;

    private Roles tellerRole;
    private Roles auditorRole;
    private Roles adminRole;
    private StaffUsers tellerStaff;
    private StaffUsers adminStaff;
    private StaffUsers otherAdminStaff;

    private static final UUID TELLER_STAFF_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID ADMIN_STAFF_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OTHER_ADMIN_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @BeforeEach
    void setUp() {
        tellerRole = Roles.builder()
                .roleId(2)
                .roleCode("TELLER")
                .roleName("Teller")
                .build();

        auditorRole = Roles.builder()
                .roleId(3)
                .roleCode("AUDITOR")
                .roleName("Auditor")
                .build();

        adminRole = Roles.builder()
                .roleId(1)
                .roleCode("ADMIN")
                .roleName("Administrator")
                .build();

        tellerStaff = StaffUsers.builder()
                .staffId(TELLER_STAFF_ID)
                .staffNo("STF-TLR-0001")
                .username("teller_jane")
                .fullName("Jane Teller")
                .email("teller@minibank.com")
                .phone("09123456789")
                .status(StaffUserStatus.ACTIVE)
                .tokenVersion(1L)
                .build();

        adminStaff = StaffUsers.builder()
                .staffId(ADMIN_STAFF_ID)
                .staffNo("STF-ADM-0001")
                .username("admin_main")
                .fullName("Main Admin")
                .email("admin@minibank.com")
                .phone("09987654321")
                .status(StaffUserStatus.ACTIVE)
                .tokenVersion(1L)
                .build();

        otherAdminStaff = StaffUsers.builder()
                .staffId(OTHER_ADMIN_ID)
                .staffNo("STF-ADM-0002")
                .username("admin_second")
                .fullName("Second Admin")
                .email("second.admin@minibank.com")
                .phone("09987654322")
                .status(StaffUserStatus.ACTIVE)
                .tokenVersion(1L)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAuthenticatedUser(String username, StaffUsers staff) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(username);

        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);

        when(staffUsersRepository.findByUsername(username)).thenReturn(Optional.ofNullable(staff));
    }

    // =========================================================================
    // 1. CREATE STAFF
    // =========================================================================
    @Nested
    @DisplayName("Create Staff Tests")
    class CreateStaffTests {

        @Test
        @DisplayName("Should successfully create a Teller staff user")
        void createStaff_Success_Teller() {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setUsername("teller_jane");
            request.setFullName("Jane Teller");
            request.setEmail("teller@minibank.com");
            request.setPhone("09123456789");
            request.setRoleId(2);

            when(staffUsersRepository.existsByEmailIgnoreCase("teller@minibank.com")).thenReturn(false);
            when(staffUsersRepository.existsByUsernameCustom("teller_jane")).thenReturn(false);
            when(rolesRepository.findById(2)).thenReturn(Optional.of(tellerRole));
            when(staffUsersRepository.findAll()).thenReturn(Collections.emptyList());
            when(staffUsersRepository.existsByStaffNo(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("hashed-initial-password");

            when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(invocation -> {
                StaffUsers saved = invocation.getArgument(0);
                saved.setStaffId(TELLER_STAFF_ID);
                return saved;
            });

            StaffResponse response = staffManagementService.createStaff(request);

            assertNotNull(response);
            assertEquals("teller_jane", response.getUsername());
            assertEquals("Jane Teller", response.getFullName());
            assertEquals("STF-TLR-0001", response.getStaffNo());
            assertEquals("TELLER", response.getRoleCode());
            assertTrue(response.isMustChangePassword());
            assertEquals(StaffUserStatus.ACTIVE, response.getStatus());

            verify(staffUserRolesRepository).save(any(StaffUserRoles.class));
        }

        @Test
        @DisplayName("Should successfully create an Auditor staff user")
        void createStaff_Success_Auditor() {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setUsername("auditor_bob");
            request.setFullName("Bob Auditor");
            request.setEmail("bob@minibank.com");
            request.setRoleId(3);

            when(staffUsersRepository.existsByEmailIgnoreCase("bob@minibank.com")).thenReturn(false);
            when(staffUsersRepository.existsByUsernameCustom("auditor_bob")).thenReturn(false);
            when(rolesRepository.findById(3)).thenReturn(Optional.of(auditorRole));
            when(staffUsersRepository.findAll()).thenReturn(Collections.emptyList());
            when(staffUsersRepository.existsByStaffNo(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("hashed-pwd");

            when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(inv -> {
                StaffUsers s = inv.getArgument(0);
                s.setStaffId(UUID.randomUUID());
                return s;
            });

            StaffResponse response = staffManagementService.createStaff(request);

            assertNotNull(response);
            assertEquals("STF-AUD-0001", response.getStaffNo());
            assertEquals("AUDITOR", response.getRoleCode());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException if email already exists")
        void createStaff_ThrowsException_WhenEmailExists() {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setEmail("teller@minibank.com");

            when(staffUsersRepository.existsByEmailIgnoreCase("teller@minibank.com")).thenReturn(true);

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.createStaff(request));
            assertEquals("Email is already registered", ex.getMessage());
            verify(staffUsersRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw RuntimeException if username already exists")
        void createStaff_ThrowsException_WhenUsernameExists() {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setEmail("new@minibank.com");
            request.setUsername("existing_user");

            when(staffUsersRepository.existsByEmailIgnoreCase("new@minibank.com")).thenReturn(false);
            when(staffUsersRepository.existsByUsernameCustom("existing_user")).thenReturn(true);

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> staffManagementService.createStaff(request));
            assertEquals("Username already exists", ex.getMessage());
        }

        @Test
        @DisplayName("Should throw RuntimeException if role not found")
        void createStaff_ThrowsException_WhenRoleNotFound() {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setEmail("new@minibank.com");
            request.setUsername("new_user");
            request.setRoleId(99);

            when(staffUsersRepository.existsByEmailIgnoreCase("new@minibank.com")).thenReturn(false);
            when(staffUsersRepository.existsByUsernameCustom("new_user")).thenReturn(false);
            when(rolesRepository.findById(99)).thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> staffManagementService.createStaff(request));
            assertEquals("Role not found", ex.getMessage());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException when attempting to create Admin role directly")
        void createStaff_ThrowsException_WhenRoleIsAdmin() {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setEmail("admin@minibank.com");
            request.setUsername("admin_new");
            request.setRoleId(1);

            when(staffUsersRepository.existsByEmailIgnoreCase("admin@minibank.com")).thenReturn(false);
            when(staffUsersRepository.existsByUsernameCustom("admin_new")).thenReturn(false);
            when(rolesRepository.findById(1)).thenReturn(Optional.of(adminRole));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.createStaff(request));
            assertTrue(ex.getMessage().contains("Admin can only create staff users with 'Teller' or 'Auditor' roles"));
        }
    }

    // =========================================================================
    // 2. GET ALL STAFF & GET BY ID
    // =========================================================================
    @Nested
    @DisplayName("Read Staff Tests")
    class ReadStaffTests {

        @Test
        @DisplayName("Should return all staff members")
        void getAllStaff_ReturnsList() {
            when(staffUsersRepository.findAll()).thenReturn(List.of(tellerStaff, adminStaff));
            when(staffUserRolesRepository.findByStaffId(TELLER_STAFF_ID))
                    .thenReturn(Optional.of(StaffUserRoles.builder().staffId(TELLER_STAFF_ID).roleId(2).staff(tellerStaff).role(tellerRole).build()));
            when(rolesRepository.findById(2)).thenReturn(Optional.of(tellerRole));

            when(staffUserRolesRepository.findByStaffId(ADMIN_STAFF_ID))
                    .thenReturn(Optional.of(StaffUserRoles.builder().staffId(ADMIN_STAFF_ID).roleId(1).staff(adminStaff).role(adminRole).build()));
            when(rolesRepository.findById(1)).thenReturn(Optional.of(adminRole));

            List<StaffResponse> list = staffManagementService.getAllStaff();

            assertEquals(2, list.size());
            assertEquals("teller_jane", list.get(0).getUsername());
            assertEquals("admin_main", list.get(1).getUsername());
        }

        @Test
        @DisplayName("Should return staff by ID when found")
        void getStaffById_Success() {
            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));
            when(staffUserRolesRepository.findByStaffId(TELLER_STAFF_ID))
                    .thenReturn(Optional.of(StaffUserRoles.builder().staffId(TELLER_STAFF_ID).roleId(2).staff(tellerStaff).role(tellerRole).build()));
            when(rolesRepository.findById(2)).thenReturn(Optional.of(tellerRole));

            StaffResponse response = staffManagementService.getStaffById(TELLER_STAFF_ID);

            assertNotNull(response);
            assertEquals(TELLER_STAFF_ID, response.getStaffId());
            assertEquals("Jane Teller", response.getFullName());
            assertEquals("TELLER", response.getRoleCode());
        }

        @Test
        @DisplayName("Should throw RuntimeException when staff ID not found")
        void getStaffById_ThrowsException_WhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(staffUsersRepository.findById(unknownId)).thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> staffManagementService.getStaffById(unknownId));
            assertEquals("Staff not found", ex.getMessage());
        }

        @Test
        @DisplayName("Should return all roles")
        void getAllRoles_ReturnsList() {
            when(rolesRepository.findAll()).thenReturn(List.of(adminRole, tellerRole, auditorRole));

            List<Roles> roles = staffManagementService.getAllRoles();

            assertEquals(3, roles.size());
        }
    }

    // =========================================================================
    // 3. UPDATE STAFF
    // =========================================================================
    @Nested
    @DisplayName("Update Staff Tests")
    class UpdateStaffTests {

        @Test
        @DisplayName("Should successfully update staff information")
        void updateStaff_Success() {
            StaffUpdateRequest request = new StaffUpdateRequest();
            request.setFullName("Jane Updated");
            request.setEmail("jane.updated@minibank.com");
            request.setPhone("0999999999");

            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));
            when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(i -> i.getArgument(0));

            StaffResponse response = staffManagementService.updateStaff(TELLER_STAFF_ID, request);

            assertNotNull(response);
            assertEquals("Jane Updated", response.getFullName());
            assertEquals("jane.updated@minibank.com", response.getEmail());
            assertEquals("0999999999", response.getPhone());
            verify(staffUsersRepository).save(tellerStaff);
        }

        @Test
        @DisplayName("Should allow Admin to update their own profile")
        void updateStaff_AllowsAdminToUpdateSelf() {
            mockAuthenticatedUser("admin_main", adminStaff);

            StaffUpdateRequest request = new StaffUpdateRequest();
            request.setFullName("Main Admin Updated");
            request.setEmail("admin.updated@minibank.com");

            when(staffUsersRepository.findById(ADMIN_STAFF_ID)).thenReturn(Optional.of(adminStaff));
            when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(i -> i.getArgument(0));

            StaffResponse response = staffManagementService.updateStaff(ADMIN_STAFF_ID, request);

            assertNotNull(response);
            assertEquals("Main Admin Updated", response.getFullName());
        }

        @Test
        @DisplayName("Should reject Admin updating another Administrator's profile")
        void updateStaff_RejectsAdminUpdatingAnotherAdmin() {
            mockAuthenticatedUser("admin_main", adminStaff);

            StaffUpdateRequest request = new StaffUpdateRequest();
            request.setFullName("Tampered Admin");

            when(staffUsersRepository.findById(OTHER_ADMIN_ID)).thenReturn(Optional.of(otherAdminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.updateStaff(OTHER_ADMIN_ID, request));
            assertEquals("Administrators cannot edit the information of other administrators.", ex.getMessage());
            verify(staffUsersRepository, never()).save(otherAdminStaff);
        }
    }

    // =========================================================================
    // 4. CHANGE ROLE
    // =========================================================================
    @Nested
    @DisplayName("Change Role Tests")
    class ChangeRoleTests {

        @Test
        @DisplayName("Should successfully change staff role from TELLER to AUDITOR and revoke sessions")
        void changeRole_Success() {
            ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
            request.setRoleId(3); // AUDITOR

            StaffUserRoles currentStaffRole = StaffUserRoles.builder().staffId(TELLER_STAFF_ID).roleId(2).staff(tellerStaff).role(tellerRole).build();

            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));
            when(rolesRepository.findById(3)).thenReturn(Optional.of(auditorRole));
            when(staffUserRolesRepository.findByStaffId(TELLER_STAFF_ID)).thenReturn(Optional.of(currentStaffRole));
            when(rolesRepository.findById(2)).thenReturn(Optional.of(tellerRole));
            when(staffUsersRepository.existsByStaffNo(anyString())).thenReturn(false);
            when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(i -> i.getArgument(0));

            StaffResponse response = staffManagementService.changeRole(TELLER_STAFF_ID, request);

            assertNotNull(response);
            assertEquals("AUDITOR", response.getRoleCode());
            assertTrue(response.getStaffNo().startsWith("STF-AUD"));
            assertEquals(2L, tellerStaff.getTokenVersion());

            verify(staffUserRolesRepository).delete(currentStaffRole);
            verify(staffUserRolesRepository).save(any(StaffUserRoles.class));
            verify(authSessionsRepository).revokeAllActiveSessionsByStaffId(TELLER_STAFF_ID);
        }

        @Test
        @DisplayName("Should reject changeRole when staff already has the requested role")
        void changeRole_ThrowsException_WhenSameRole() {
            ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
            request.setRoleId(2); // TELLER (already teller)

            StaffUserRoles currentStaffRole = StaffUserRoles.builder().staffId(TELLER_STAFF_ID).roleId(2).staff(tellerStaff).role(tellerRole).build();

            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));
            when(rolesRepository.findById(2)).thenReturn(Optional.of(tellerRole));
            when(staffUserRolesRepository.findByStaffId(TELLER_STAFF_ID)).thenReturn(Optional.of(currentStaffRole));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.changeRole(TELLER_STAFF_ID, request));
            assertTrue(ex.getMessage().contains("Staff member already has the role"));
        }

        @Test
        @DisplayName("Should reject Admin changing their own role")
        void changeRole_RejectsAdminChangingSelfRole() {
            mockAuthenticatedUser("admin_main", adminStaff);

            ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
            request.setRoleId(2);

            when(staffUsersRepository.findById(ADMIN_STAFF_ID)).thenReturn(Optional.of(adminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.changeRole(ADMIN_STAFF_ID, request));
            assertEquals("Administrators cannot change their own role.", ex.getMessage());
        }

        @Test
        @DisplayName("Should reject Admin changing another Administrator's role")
        void changeRole_RejectsAdminChangingOtherAdminRole() {
            mockAuthenticatedUser("admin_main", adminStaff);

            ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
            request.setRoleId(2);

            when(staffUsersRepository.findById(OTHER_ADMIN_ID)).thenReturn(Optional.of(otherAdminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.changeRole(OTHER_ADMIN_ID, request));
            assertEquals("Administrators cannot change the role of other administrators.", ex.getMessage());
        }

        @Test
        @DisplayName("Should reject role change to unsupported role code")
        void changeRole_ThrowsException_WhenTargetRoleInvalid() {
            Roles managerRole = Roles.builder().roleId(5).roleCode("MANAGER").roleName("Manager").build();
            ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
            request.setRoleId(5);

            StaffUserRoles currentStaffRole = StaffUserRoles.builder().staffId(TELLER_STAFF_ID).roleId(2).staff(tellerStaff).role(tellerRole).build();

            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));
            when(rolesRepository.findById(5)).thenReturn(Optional.of(managerRole));
            when(staffUserRolesRepository.findByStaffId(TELLER_STAFF_ID)).thenReturn(Optional.of(currentStaffRole));
            when(rolesRepository.findById(2)).thenReturn(Optional.of(tellerRole));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.changeRole(TELLER_STAFF_ID, request));
            assertTrue(ex.getMessage().contains("Role change to Manager is not permitted."));
        }
    }

    // =========================================================================
    // 5. DEACTIVATE STAFF
    // =========================================================================
    @Nested
    @DisplayName("Deactivate Staff Tests")
    class DeactivateStaffTests {

        @Test
        @DisplayName("Should successfully deactivate active staff member and increment token version")
        void deactivateStaff_Success() {
            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));
            when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(i -> i.getArgument(0));

            StaffResponse response = staffManagementService.deactivateStaff(TELLER_STAFF_ID);

            assertNotNull(response);
            assertEquals(StaffUserStatus.DEACTIVATED, response.getStatus());
            assertEquals(2L, tellerStaff.getTokenVersion());
            verify(staffUsersRepository).save(tellerStaff);
        }

        @Test
        @DisplayName("Should throw RuntimeException when deactivating already deactivated staff")
        void deactivateStaff_ThrowsException_WhenAlreadyInactive() {
            tellerStaff.setStatus(StaffUserStatus.DEACTIVATED);
            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> staffManagementService.deactivateStaff(TELLER_STAFF_ID));
            assertEquals("Staff account is already inactive", ex.getMessage());
        }

        @Test
        @DisplayName("Should reject Admin deactivating themselves")
        void deactivateStaff_RejectsAdminDeactivatingSelf() {
            mockAuthenticatedUser("admin_main", adminStaff);

            when(staffUsersRepository.findById(ADMIN_STAFF_ID)).thenReturn(Optional.of(adminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.deactivateStaff(ADMIN_STAFF_ID));
            assertEquals("Administrators cannot deactivate their own account.", ex.getMessage());
        }

        @Test
        @DisplayName("Should reject Admin deactivating another administrator")
        void deactivateStaff_RejectsAdminDeactivatingOtherAdmin() {
            mockAuthenticatedUser("admin_main", adminStaff);

            when(staffUsersRepository.findById(OTHER_ADMIN_ID)).thenReturn(Optional.of(otherAdminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.deactivateStaff(OTHER_ADMIN_ID));
            assertEquals("Administrators cannot deactivate other administrators.", ex.getMessage());
        }
    }

    // =========================================================================
    // 6. PASSWORD RESET VALIDATION & HELPER METHODS
    // =========================================================================
    @Nested
    @DisplayName("Reset Password RBAC and Helper Tests")
    class PasswordResetAndHelperTests {

        @Test
        @DisplayName("Should allow password reset validation for Teller by Admin")
        void validateAdminCanResetPassword_AllowsTellerReset() {
            mockAuthenticatedUser("admin_main", adminStaff);

            when(staffUsersRepository.findById(TELLER_STAFF_ID)).thenReturn(Optional.of(tellerStaff));

            assertDoesNotThrow(() -> staffManagementService.validateAdminCanResetPassword(TELLER_STAFF_ID));
        }

        @Test
        @DisplayName("Should reject password reset for another Administrator")
        void validateAdminCanResetPassword_RejectsOtherAdmin() {
            mockAuthenticatedUser("admin_main", adminStaff);

            when(staffUsersRepository.findById(OTHER_ADMIN_ID)).thenReturn(Optional.of(otherAdminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> staffManagementService.validateAdminCanResetPassword(OTHER_ADMIN_ID));
            assertEquals("Administrators cannot reset the password of other administrators.", ex.getMessage());
        }

        @Test
        @DisplayName("Should format role prefixes correctly")
        void getRolePrefix_FormatsCorrectly() {
            assertEquals("STF-ADM", staffManagementService.getRolePrefix("ADMIN"));
            assertEquals("STF-TLR", staffManagementService.getRolePrefix("TELLER"));
            assertEquals("STF-AUD", staffManagementService.getRolePrefix("AUDITOR"));
            assertEquals("STF-MANAGER", staffManagementService.getRolePrefix("MANAGER"));
            assertEquals("STF", staffManagementService.getRolePrefix(null));
        }

        @Test
        @DisplayName("Should update staff number prefix when role changes while preserving number")
        void updateStaffNoForRole_PreservesDigits() {
            when(staffUsersRepository.existsByStaffNo("STF-AUD-0005")).thenReturn(false);

            String updated = staffManagementService.updateStaffNoForRole("STF-TLR-0005", "AUDITOR");
            assertEquals("STF-AUD-0005", updated);
        }
    }
}
