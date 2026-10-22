package com.corebanking.service;

import com.corebanking.dto.*;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mail.MailSendException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real isolated MySQL rows + real Spring transaction advice on production service
 * entry points. Repository mocks write through JDBC into the same transaction.
 * This verifies commit/rollback and metadata bounds, not Hibernate mappings or row locks.
 * No application configuration or real customer database is loaded.
 */
@EnabledIfSystemProperty(named="corporate.test.jdbcUrl", matches="jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/corporate_session_race_test\\?.*")
class CusAuthenticationMetadataPersistenceTest {
    private JdbcTemplate jdbc;
    private DataSourceTransactionManager transactions;
    private CusAuthenticationEventMetadataTest.Fixture fixture;
    private static final String IPV6="2001:db8::42";
    private static final String GROUP="22222222-2222-4222-8222-222222222222";

    @BeforeEach void isolatedPersistence() {
        var dataSource=new DriverManagerDataSource(System.getProperty("corporate.test.jdbcUrl"),"root","test-only-corporate-race");
        jdbc=new JdbcTemplate(dataSource); transactions=new DataSourceTransactionManager(dataSource);
        jdbc.execute("CREATE TABLE IF NOT EXISTS login_attempts (id BIGINT AUTO_INCREMENT PRIMARY KEY, actor_type VARCHAR(32), login_identifier VARCHAR(191), success BOOLEAN, failure_reason VARCHAR(64), ip_address VARCHAR(45), user_agent VARCHAR(255)) ENGINE=InnoDB");
        jdbc.execute("CREATE TABLE IF NOT EXISTS audit_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, action_type VARCHAR(64), actor_type VARCHAR(32), ip_address VARCHAR(45), user_agent VARCHAR(255), old_values TEXT, new_values TEXT) ENGINE=InnoDB");
        jdbc.update("DELETE FROM login_attempts");jdbc.update("DELETE FROM audit_logs");
        fixture=new CusAuthenticationEventMetadataTest.Fixture(false,CorporateRole.CEO);
        when(fixture.attempts.save(any(LoginAttempt.class))).thenAnswer(call->{LoginAttempt a=call.getArgument(0);
            jdbc.update("INSERT INTO login_attempts(actor_type,login_identifier,success,failure_reason,ip_address,user_agent) VALUES (?,?,?,?,?,?)",a.getActorType().name(),a.getLoginIdentifier(),a.isSuccess(),a.getFailureReason(),a.getIpAddress(),a.getUserAgent());return a;});
        when(fixture.audit.save(any(AuditLogs.class))).thenAnswer(call->{AuditLogs a=call.getArgument(0);
            jdbc.update("INSERT INTO audit_logs(action_type,actor_type,ip_address,user_agent,old_values,new_values) VALUES (?,?,?,?,?,?)",a.getActionType(),a.getActorType().name(),a.getIpAddress(),a.getUserAgent(),a.getOldValues(),a.getNewValues());return a;});
    }
    @SuppressWarnings("unchecked")
    private <T>T advised(T target){
        var advice=new TransactionInterceptor();advice.setTransactionManager(transactions);advice.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory=new ProxyFactory(target);factory.setProxyTargetClass(true);factory.addAdvice(advice);return (T)factory.getProxy();
    }

    @ParameterizedTest
    @ValueSource(strings={"individual-password","individual-identifier","individual-locked","individual-inactive","individual-fifth","corporate-password","corporate-identifier","corporate-locked","corporate-inactive","corporate-fifth"})
    void failedLoginRowsCommitAfterAuthenticationException(String scenario){
        boolean corporate=scenario.startsWith("corporate");
        if(scenario.endsWith("locked")){
            if(corporate)fixture.corporateCredential.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            else fixture.credential.setLockedUntil(LocalDateTime.now().plusMinutes(15));
        }
        if(scenario.endsWith("inactive")){
            if(corporate)fixture.corporateCredential.getCorporateUser().setStatus(CorporateUserStatus.INACTIVE);
            else fixture.customer.setStatus(CustomerStatus.INACTIVE);
        }
        if(scenario.endsWith("fifth")){
            if(corporate)fixture.corporateCredential.setFailedLoginCount(4);else fixture.credential.setFailedLoginCount(4);
        }
        var metadata=new CusSessionClientMetadata(IPV6,"A".repeat(5000));
        Class<? extends RuntimeException> expected=scenario.endsWith("locked")||scenario.endsWith("fifth")?CusAccountLockedException.class:CusAuthenticationException.class;
        if(corporate){
            var request=new CusCorporateLoginRequest();request.setCompanyCustomerCode(scenario.endsWith("identifier")?"UNKNOWN":"COMPANY-001");request.setCorporateUserCode("USER-001");request.setPassword("WrongPass1!");
            var proxy=advised(fixture.corporateLogin);
            assertThrows(expected,()->proxy.authenticateCredentials(request,metadata));
        }else{
            var request=new CusLoginRequest();request.setLoginIdentifier(scenario.endsWith("identifier")?"UNKNOWN":"TEST-001");request.setPassword("WrongPass1!");
            var proxy=advised(fixture.individualAuth);
            assertThrows(expected,()->proxy.authenticateCredentials(request,metadata));
        }
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM login_attempts",Integer.class));
        var row=jdbc.queryForMap("SELECT * FROM login_attempts");assertEquals(IPV6,row.get("ip_address"));assertEquals("A".repeat(255),row.get("user_agent"));
        assertEquals(corporate?"CORPORATE_USER":"CUSTOMER",row.get("actor_type"));
        assertEquals(scenario.endsWith("identifier")?"INVALID_IDENTIFIER":scenario.endsWith("inactive")?"ACCOUNT_INACTIVE":scenario.endsWith("locked")||scenario.endsWith("fifth")?"ACCOUNT_LOCKED":"INVALID_PASSWORD",row.get("failure_reason"));
    }

    @Test void emailFailureAuditCommitsWithExistingNoRollbackRule(){
        doThrow(new MailSendException("test-only offline")).when(fixture.email).sendLoginOtp(anyString(),anyString());
        var request=new CusLoginRequest();request.setLoginIdentifier("TEST-001");request.setPassword("GoodPass1!");
        var proxy=advised(fixture.individualAuth);
        assertThrows(CusEmailException.class,()->proxy.authenticateCredentials(request,new CusSessionClientMetadata(IPV6,"Email failure agent")));
        var row=jdbc.queryForMap("SELECT * FROM audit_logs WHERE action_type='OTP_SEND_FAILED'");
        assertEquals(IPV6,row.get("ip_address"));assertEquals("Email failure agent",row.get("user_agent"));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM login_attempts",Integer.class));
    }

    @Test void expiredOtpAuditCommitsWithExistingNoRollbackRule(){
        fixture.challenge.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        var request=new CusOtpVerifyRequest();request.setChallengeGroupId(GROUP);request.setOtp("123456");
        var proxy=advised(fixture.individualAuth);
        assertThrows(CusOtpException.class,()->proxy.verifyLoginOtp(request,new CusSessionClientMetadata(IPV6,"Expiry agent")));
        var row=jdbc.queryForMap("SELECT * FROM audit_logs WHERE action_type='OTP_EXPIRED'");
        assertEquals(IPV6,row.get("ip_address"));assertEquals("Expiry agent",row.get("user_agent"));
        assertFalse(String.valueOf(row.get("new_values")).contains("123456"));
    }
}
