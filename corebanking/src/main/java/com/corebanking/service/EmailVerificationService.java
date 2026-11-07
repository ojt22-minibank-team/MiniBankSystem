package com.corebanking.service;

import com.corebanking.exception.InvalidEmailException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.naming.Context;
import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;
import java.util.regex.Pattern;

@Slf4j
@Service
public class EmailVerificationService {

    private static final String GMAIL_DOMAIN = "gmail.com";
    private static final Pattern GMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@gmail\\.com$", Pattern.CASE_INSENSITIVE);
    private static final String DNS_FACTORY = "com.sun.jndi.dns.DnsContextFactory";

    /**
     * Verifies that the submitted email is a valid @gmail.com address and has a valid, active MX host via DNS lookup.
     *
     * @param email The target email address to verify
     * @throws InvalidEmailException if validation fails or the domain has no reachable MX records
     */
    public void verifyEmailHost(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidEmailException("Email address is required.");
        }

        String trimmedEmail = email.trim();

        if (!GMAIL_PATTERN.matcher(trimmedEmail).matches()) {
            throw new InvalidEmailException("Email must be a valid @gmail.com address");
        }

        String domain = extractDomain(trimmedEmail);
        verifyMxRecords(domain);
    }

    private String extractDomain(String email) {
        int atIndex = email.lastIndexOf('@');
        if (atIndex == -1 || atIndex == email.length() - 1) {
            return GMAIL_DOMAIN;
        }
        return email.substring(atIndex + 1).trim();
    }

    protected void verifyMxRecords(String domain) {
        Hashtable<String, String> env = new Hashtable<>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, DNS_FACTORY);
        env.put("com.sun.jndi.dns.timeout.initial", "4000");
        env.put("com.sun.jndi.dns.timeout.retries", "1");

        DirContext ictx = null;
        try {
            ictx = createDirContext(env);
            Attributes attrs = ictx.getAttributes(domain, new String[]{"MX"});
            if (attrs == null) {
                log.warn("DNS attributes query returned null for domain: {}", domain);
                throw new InvalidEmailException("The provided email address does not have a reachable mail server.");
            }

            Attribute attr = attrs.get("MX");
            if (attr == null || attr.size() == 0) {
                log.warn("No MX records found for domain: {}", domain);
                throw new InvalidEmailException("The provided email address does not have a reachable mail server.");
            }

            NamingEnumeration<?> en = attr.getAll();
            if (en == null || !en.hasMore()) {
                log.warn("Empty MX records enumeration for domain: {}", domain);
                throw new InvalidEmailException("The provided email address does not have a reachable mail server.");
            }

            log.info("Email host domain {} successfully verified with active MX records.", domain);
        } catch (NamingException e) {
            log.error("DNS MX lookup failed for domain {}: {}", domain, e.getMessage());
            throw new InvalidEmailException("The provided email address does not have a reachable mail server.", e);
        } finally {
            if (ictx != null) {
                try {
                    ictx.close();
                } catch (NamingException e) {
                    log.debug("Failed to close JNDI DirContext: {}", e.getMessage());
                }
            }
        }
    }

    protected DirContext createDirContext(Hashtable<String, String> env) throws NamingException {
        return new InitialDirContext(env);
    }
}
