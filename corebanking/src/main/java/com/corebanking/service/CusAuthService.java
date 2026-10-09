package com.corebanking.service;

import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.repository.CusJwtRevokedTokensRepository;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class CusAuthService {

    private final CusJwtService cusJwtService;
    private final CusSessionService cusSessionService;
    private final CusJwtRevokedTokensRepository jwtRevokedTokensRepository;

    // =========================================================
    // CUSTOMER OTP VERIFY (အဆုံးသတ် Return ပိုင်း)
    // =========================================================
    /*
     * (အထက်တွင် verifyLoginOtp logic များ ရှိပြီးနောက်
     * Customer entity ကို ပြန်လည်ပေးပို့သည့် နေရာ ဖြစ်ပါသည်)
     */
    // return otpChallenge.getCustomer();


    // =========================================================
    // CUSTOMER LOGOUT (Group 1 ပိုင်ဆိုင်သော Logout Logic သီးသန့်)
    // =========================================================
    @Transactional
    public void logout(String authorizationHeader) {

        // -----------------------------------------
        // 1. Authorization Header စစ်ဆေးခြင်း (Syntax Error ပြင်ဆင်ပြီး)
        // -----------------------------------------
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Access token is required.");
        }

        // -----------------------------------------
        // 2. Extract Access Token
        // -----------------------------------------
        String accessToken = authorizationHeader.substring(7).trim();

        // -----------------------------------------
        // 3. JWT validate + read claims
        // -----------------------------------------
        Claims claims = cusJwtService.getClaims(accessToken);

        // -----------------------------------------
        // 4. ACCESS token ဟုတ်မဟုတ် စစ်ဆေးခြင်း
        // -----------------------------------------
        String tokenType = claims.get("tokenType", String.class);
        if (!"ACCESS".equals(tokenType)) {
            throw new RuntimeException("Invalid access token.");
        }

        // -----------------------------------------
        // 5. Token ID (jti) ရယူခြင်း
        // -----------------------------------------
        String jti = claims.getId();
        if (jti == null || jti.isBlank()) {
            throw new RuntimeException("Invalid token ID.");
        }

        // -----------------------------------------
        // 6. Session validate ပြုလုပ်ခြင်း
        // -----------------------------------------
        AuthSessions session = cusSessionService.validateAccessSession(claims);

        // -----------------------------------------
        // 7. Access Token အား blacklist ထဲသို့ ထည့်သွင်းသိမ်းဆည်းခြင်း
        // -----------------------------------------
        if (!jwtRevokedTokensRepository.existsByJti(jti)) {
            JwtRevokedTokens revokedToken = JwtRevokedTokens.builder()
                    .jti(jti)
                    .subjectType(SessionSubjectType.CUSTOMER)
                    .customer(session.getCustomer())
                    .staff(null)
                    .tokenExpiresAt(
                            claims.getExpiration()
                                    .toInstant()
                                    .atZone(ZoneId.systemDefault())
                                    .toLocalDateTime()
                    )
                    .reason("USER_LOGOUT")
                    .build();

            jwtRevokedTokensRepository.save(revokedToken);
        }

        // -----------------------------------------
        // 8. လက်ရှိ Session အား Revoke ပြုလုပ်ခြင်း
        // -----------------------------------------
        cusSessionService.revokeSession(session, "USER_LOGOUT");
    }
}