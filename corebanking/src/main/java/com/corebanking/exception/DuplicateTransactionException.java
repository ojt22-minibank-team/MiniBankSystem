package com.corebanking.exception;

public class DuplicateTransactionException extends RuntimeException {
    private static final long serialVersionUID = 1L;

	public DuplicateTransactionException(String message) {
        super(message);
    }
}
