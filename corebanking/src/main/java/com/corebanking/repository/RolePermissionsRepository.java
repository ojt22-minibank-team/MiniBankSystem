package com.corebanking.repository;

import com.corebanking.entity.RolePermissions;
import com.corebanking.entity.RolePermissions.RolePermissionId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RolePermissionsRepository extends JpaRepository<RolePermissions, RolePermissionId> {
}