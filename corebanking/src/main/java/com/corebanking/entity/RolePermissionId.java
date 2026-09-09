package com.corebanking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RolePermissionId implements Serializable {
	private static final long serialVersionUID = 1L;
    @Column(name = "role_id", nullable = false,columnDefinition = "INT UNSIGNED")
    private Integer roleId;

    @Column(name = "permission_id", nullable = false,columnDefinition = "INT UNSIGNED")
    private Integer permissionId;
}