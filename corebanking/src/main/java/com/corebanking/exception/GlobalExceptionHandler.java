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

@RestControllerAdvice
public class GlobalExceptionHandler {

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
public ResponseEntity<Map<String, Object>> handleValidationError(MethodArgumentNotValidException ex) {
String details = ex.getBindingResult().getFieldErrors().stream()
.map(error -> error.getField() + ": " + error.getDefaultMessage())
.collect(Collectors.joining(", "));
return buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", details);
}

@ExceptionHandler(Exception.class)
public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", ex.getMessage());
}

private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String errorCode, String message) {
Map<String, Object> body = new HashMap<>();
body.put("timestamp", LocalDateTime.now());
body.put("status", status.value());
body.put("code", errorCode);
body.put("message", message);
return new ResponseEntity<>(body, status);
}

@ExceptionHandler(CusAuthenticationException.class)
public ResponseEntity<Map<String, Object>>
        handleCusAuthenticationException(
                CusAuthenticationException ex) {

    Map<String, Object> response =
            new LinkedHashMap<>();

    response.put(
            "code",
            "UNAUTHORIZED"
    );

    response.put(
            "message",
            ex.getMessage()
    );

    response.put(
            "timestamp",
            LocalDateTime.now()
    );

    response.put(
            "status",
            HttpStatus.UNAUTHORIZED.value()
    );

    return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(response);
}
}