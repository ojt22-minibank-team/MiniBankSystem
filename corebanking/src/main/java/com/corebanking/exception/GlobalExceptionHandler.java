package com.corebanking.exception;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurityException(SecurityException ex) {
        log.warn("Security validation failed: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessExceptions(IllegalStateException ex) {
        log.warn("Business rule violation: {}", ex.getMessage());
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage());
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientFunds(InsufficientFundsException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "INSUFFICIENT_FUNDS", ex.getMessage());
    }

    @ExceptionHandler(InvalidPinException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidPin(InvalidPinException ex) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "INVALID_PIN", ex.getMessage());
    }

    @ExceptionHandler(DuplicateTransactionException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateTransaction(DuplicateTransactionException ex) {
        return buildErrorResponse(HttpStatus.CONFLICT, "DUPLICATE_TRANSACTION", ex.getMessage());
    }

    @ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleAccountNotFound(AccountNotFoundException ex) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(TransactionException.class)
    public ResponseEntity<Map<String, Object>> handleTransactionException(TransactionException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "TRANSACTION_FAILED", ex.getMessage());
    }

    @ExceptionHandler({CannotAcquireLockException.class, PessimisticLockingFailureException.class})
    public ResponseEntity<Map<String, Object>> handleConcurrencyLockFailure(Exception ex) {
        return buildErrorResponse(
                HttpStatus.SERVICE_UNAVAILABLE,
                "DEADLOCK_DETECTED",
                "Concurrent transaction conflict detected. Please retry your transfer."
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        
        log.warn("Payload validation failed: {}", errorMessage);
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", errorMessage);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAllOtherExceptions(Exception ex) {
        log.error("Unexpected error occurred", ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "An unexpected system error occurred.");
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String errorCode, String message) {
        Map<String, Object> errorBody = new LinkedHashMap<>();
        errorBody.put("success", status.is2xxSuccessful());
        errorBody.put("timestamp", LocalDateTime.now());
        errorBody.put("status", status.value());
        errorBody.put("code", errorCode);
        errorBody.put("error", status.getReasonPhrase());
        errorBody.put("message", message);

        return ResponseEntity.status(status).body(errorBody);
    }

    @ExceptionHandler(com.corebanking.exception.CusAuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleCusAuthenticationException(com.corebanking.exception.CusAuthenticationException ex) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("code", "UNAUTHORIZED");
        response.put("message", ex.getMessage());
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.UNAUTHORIZED.value());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(CusAccountLockedException.class)
    public ResponseEntity<Map<String, Object>> handleAccountLocked(CusAccountLockedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", "ACCOUNT_LOCKED");
        body.put("message", ex.getMessage());
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 423);
        return ResponseEntity.status(HttpStatus.LOCKED).body(body);
    }

    @ExceptionHandler(CusOtpException.class)
    public ResponseEntity<Map<String, Object>> handleOtpException(CusOtpException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "OTP_ERROR", ex.getMessage());
    }

    @ExceptionHandler(CusSessionExpiredException.class)
    public ResponseEntity<Map<String, Object>> handleSessionExpired(CusSessionExpiredException ex) {
        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", ex.getMessage());
    }

    @ExceptionHandler(CusOtpResendLimitException.class)
    public ResponseEntity<Map<String, Object>> handleOtpResendLimit(CusOtpResendLimitException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", "OTP_RESEND_LIMIT_REACHED");
        body.put("message", ex.getMessage());
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 429);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(body);
    }

    @ExceptionHandler(CusEmailException.class)
    public ResponseEntity<Map<String, Object>> handleEmailException(CusEmailException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", "EMAIL_SERVICE_UNAVAILABLE");
        body.put("message", ex.getMessage());
        body.put("timestamp", LocalDateTime.now());
        body.put("status", 503);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}
