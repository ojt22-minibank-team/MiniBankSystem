package com.corebanking.exception;

public class CusOtpResendLimitException extends RuntimeException {

    public CusOtpResendLimitException(String message) {
        super(message);
    }
}