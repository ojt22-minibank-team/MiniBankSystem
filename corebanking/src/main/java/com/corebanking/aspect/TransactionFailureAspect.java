package com.corebanking.aspect;

import com.corebanking.dto.EcommercePaymentRequestDto;
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

    // P2PTransferService ရော EcommercePaymentService ကိုပါ ၂ ခုစလုံး ကြားဖြတ်စောင့်ကြည့်မည်
    @AfterThrowing(
        pointcut = "execution(* com.corebanking.service.P2PTransferService.processP2PTransfer(..)) || " +
                   "execution(* com.corebanking.service.EcommercePaymentService.processEcommercePayment(..))",
        throwing = "ex"
    )
    public void handleTransferFailure(JoinPoint joinPoint, Throwable ex) {
        String failureCode = resolveEligibleFailureCode(ex);
        if (failureCode == null) {
            return;
        }

        Object[] args = joinPoint.getArgs();
        String failureMessage = ex.getMessage();

        // ၁။ P2P Transfer ကျရှုံးမှုကို ကိုင်တွယ်ခြင်း
        if (args.length >= 3 && args[1] instanceof P2PTransferRequestDto request) {
            String idempotencyKey = (String) args[2];
            executePostRollback(() -> transactionAuditService.recordFailedTransfer(request, idempotencyKey, failureCode, failureMessage));
        }
        // ၂။ E-Commerce Payment ကျရှုံးမှုကို ကိုင်တွယ်ခြင်း
        else if (args.length >= 2 && args[0] instanceof EcommercePaymentRequestDto request) {
            String idempotencyKey = (String) args[1];
            executePostRollback(() -> transactionAuditService.recordFailedEcommercePayment(request, idempotencyKey, failureCode, failureMessage));
        }
    }

    private void executePostRollback(Runnable task) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    task.run();
                }
            });
        } else {
            task.run();
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
            if (msg.contains("not active") || msg.contains("frozen")) {
                return "ACCOUNT_NOT_ACTIVE";
            }
        }
        return null;
    }
}