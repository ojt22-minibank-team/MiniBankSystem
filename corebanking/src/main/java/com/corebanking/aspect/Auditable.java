package com.corebanking.aspect;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods for automated immutable audit logging.
 * Intercepted by {@link AuditAspect} via Spring AOP.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {

    /**
     * Functional category of the action (e.g. "ACCOUNT", "USER_MGMT", "AUTH").
     */
    String actionCategory();

    /**
     * Specific action name (e.g. "ACCOUNT_FREEZE", "ACCOUNT_UNFREEZE", "ROLE_CHANGE").
     */
    String actionType();

    /**
     * Type of entity affected (e.g. "ACCOUNT", "STAFF_USER", "CUSTOMER").
     */
    String entityType();

    /**
     * Human-readable description of what the action does.
     */
    String description() default "";
}
