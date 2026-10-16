package com.corebanking.aspect;

import com.corebanking.service.AuditTrailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * Spring AOP Aspect that automatically intercepts methods annotated with {@link Auditable}
 * and immutably records the operation outcome into the system audit trail.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditTrailService auditTrailService;

    @Around("@annotation(auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        long startTime = System.currentTimeMillis();
        Object result = null;
        Throwable methodException = null;

        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable ex) {
            methodException = ex;
            throw ex;
        } finally {
            try {
                long duration = System.currentTimeMillis() - startTime;
                String status = (methodException == null) ? "SUCCESS" : "FAILED (" + methodException.getMessage() + ")";
                String description = auditable.description().isEmpty()
                        ? String.format("Method %s executed with status: %s (duration: %d ms)",
                        joinPoint.getSignature().toShortString(), status, duration)
                        : auditable.description();

                Object[] args = joinPoint.getArgs();
                Object oldState = (args != null && args.length > 0) ? args[0] : null;

                auditTrailService.logDataChange(
                        auditable.actionType(),
                        auditable.entityType(),
                        joinPoint.getSignature().getName(),
                        oldState,
                        result,
                        description
                );
            } catch (Exception auditEx) {
                // Defensive: Audit failure must never compromise primary business flow
                log.error("Failed to capture audit log in AuditAspect for method: {}",
                        joinPoint.getSignature().toShortString(), auditEx);
            }
        }
    }
}
