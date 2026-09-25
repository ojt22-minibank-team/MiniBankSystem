package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CusOtpVerifyRequest {

    private String challengeGroupId;

    private String otp;
}
//{
//"challengeGroupId": "0ec12345-abcd-4567-8910-abc123456789",
//"otp": "482193"
//}