package com.corebanking.repository;

import com.corebanking.entity.RolePermissions;
import com.corebanking.entity.RolePermissionId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolePermissionRepository
        extends JpaRepository<RolePermissions, RolePermissionId> {
	
	List<RolePermissions> findById_RoleId(Integer roleId);
}