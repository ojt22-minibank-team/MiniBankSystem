package com.corebanking.exception;

public class PasswordMismatchException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public PasswordMismatchException(String message) {
        super(message);
    }

    public PasswordMismatchException(String message, Throwable cause) {
        super(message, cause);
    }
}
