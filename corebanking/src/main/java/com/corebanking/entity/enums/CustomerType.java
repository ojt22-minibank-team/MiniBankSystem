package com.corebanking.entity.enums;
public enum CustomerType {
    PERSONAL,
    COMPANY;

    public static CustomerType fromString(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Customer type cannot be null");
        }
        try {
            return CustomerType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid customer type: " + value);
        }
    }
}