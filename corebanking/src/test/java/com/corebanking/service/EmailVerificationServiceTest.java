package com.corebanking.service;

import com.corebanking.exception.InvalidEmailException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import java.util.Hashtable;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock
    private DirContext mockDirContext;

    @Mock
    private Attributes mockAttributes;

    @Mock
    private Attribute mockAttribute;

    @Mock
    private NamingEnumeration<?> mockEnumeration;

    @Test
    @DisplayName("verifyEmailHost with valid @gmail.com and active MX records succeeds")
    void testVerifyEmailHost_ValidGmail_Success() throws Exception {
        EmailVerificationService service = new EmailVerificationService() {
            @Override
            protected DirContext createDirContext(Hashtable<String, String> env) {
                return mockDirContext;
            }
        };

        when(mockDirContext.getAttributes(eq("gmail.com"), any(String[].class))).thenReturn(mockAttributes);
        when(mockAttributes.get("MX")).thenReturn(mockAttribute);
        when(mockAttribute.size()).thenReturn(2);
        doReturn(mockEnumeration).when(mockAttribute).getAll();
        when(mockEnumeration.hasMore()).thenReturn(true);

        assertDoesNotThrow(() -> service.verifyEmailHost("john.doe@gmail.com"));
    }

    @Test
    @DisplayName("verifyEmailHost rejects non-gmail domains")
    void testVerifyEmailHost_NonGmailDomain_ThrowsException() {
        EmailVerificationService service = new EmailVerificationService();

        InvalidEmailException ex1 = assertThrows(InvalidEmailException.class,
                () -> service.verifyEmailHost("user@yahoo.com"));
        assertTrue(ex1.getMessage().contains("Email must be a valid @gmail.com address"));

        InvalidEmailException ex2 = assertThrows(InvalidEmailException.class,
                () -> service.verifyEmailHost("corporate@company.org"));
        assertTrue(ex2.getMessage().contains("Email must be a valid @gmail.com address"));

        InvalidEmailException ex3 = assertThrows(InvalidEmailException.class,
                () -> service.verifyEmailHost("hacker@gmail.com.ph"));
        assertTrue(ex3.getMessage().contains("Email must be a valid @gmail.com address"));
    }

    @Test
    @DisplayName("verifyEmailHost rejects null or blank emails")
    void testVerifyEmailHost_NullOrBlank_ThrowsException() {
        EmailVerificationService service = new EmailVerificationService();

        assertThrows(InvalidEmailException.class, () -> service.verifyEmailHost(null));
        assertThrows(InvalidEmailException.class, () -> service.verifyEmailHost(""));
        assertThrows(InvalidEmailException.class, () -> service.verifyEmailHost("   "));
    }

    @Test
    @DisplayName("verifyEmailHost throws InvalidEmailException when no MX records found")
    void testVerifyEmailHost_NoMxRecords_ThrowsException() throws Exception {
        EmailVerificationService service = new EmailVerificationService() {
            @Override
            protected DirContext createDirContext(Hashtable<String, String> env) {
                return mockDirContext;
            }
        };

        when(mockDirContext.getAttributes(eq("gmail.com"), any(String[].class))).thenReturn(mockAttributes);
        when(mockAttributes.get("MX")).thenReturn(null);

        InvalidEmailException ex = assertThrows(InvalidEmailException.class,
                () -> service.verifyEmailHost("test@gmail.com"));
        assertEquals("The provided email address does not have a reachable mail server.", ex.getMessage());
    }

    @Test
    @DisplayName("verifyEmailHost throws InvalidEmailException when DNS lookup fails with NamingException")
    void testVerifyEmailHost_DnsLookupFailure_ThrowsException() throws Exception {
        EmailVerificationService service = new EmailVerificationService() {
            @Override
            protected DirContext createDirContext(Hashtable<String, String> env) throws NamingException {
                throw new NamingException("DNS server timeout");
            }
        };

        InvalidEmailException ex = assertThrows(InvalidEmailException.class,
                () -> service.verifyEmailHost("validuser@gmail.com"));
        assertEquals("The provided email address does not have a reachable mail server.", ex.getMessage());
    }
}
