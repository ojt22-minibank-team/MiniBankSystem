package com.corebanking.aspect;

import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
import com.corebanking.service.TransactionAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class TransactionFailureAspect {

    private final TransactionAuditService transactionAuditService;

    @AfterThrowing(
        pointcut = "execution(* com.corebanking.service.P2PTransferService.processP2PTransfer(..))",
        throwing = "ex"
    )
    public void handleTransferFailure(JoinPoint joinPoint, Throwable ex) {
        Object[] args = joinPoint.getArgs();
        if (args.length >= 3 && args[1] instanceof P2PTransferRequestDto request) {
            String idempotencyKey = (String) args[2];
            
            
            String failureCode = resolveEligibleFailureCode(ex);
            if (failureCode == null) {
                return;
            }

            String failureMessage = ex.getMessage();

           
            if (TransactionSynchronizationManager.isActualTransactionActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        transactionAuditService.recordFailedTransfer(request, idempotencyKey, failureCode, failureMessage);
                    }
                });
            } else {
                transactionAuditService.recordFailedTransfer(request, idempotencyKey, failureCode, failureMessage);
            }
        }
    }

    private String resolveEligibleFailureCode(Throwable ex) {
        if (ex instanceof InsufficientFundsException) {
            return "INSUFFICIENT_FUNDS";
        }
        if (ex instanceof TransactionException) {
            String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
            if (msg.contains("daily limit")) {
                return "DAILY_LIMIT_EXCEEDED";
            }
            if (msg.contains("not active")) {
                return "ACCOUNT_NOT_ACTIVE";
            }
        }
        
        return null;
    }
}