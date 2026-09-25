package com.corebanking.util;

import java.security.SecureRandom;

public class PasswordGeneratorUtil {

    private static final String UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijklmnopqrstuvwxyz";
    private static final String DIGITS = "0123456789";
    private static final String SPECIAL = "@#$%!&*";
    private static final String ALL_CHARS = UPPER + LOWER + DIGITS + SPECIAL;

    private static final SecureRandom random = new SecureRandom();

    /**
     * အနည်းဆုံး ၈ လုံးပါဝင်ပြီး Policy များနှင့် ကိုက်ညီသော Temporary Password အား Auto Generate ထုတ်ပေးခြင်း
     */
    public static String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder();

        // Policy နှင့် ကိုက်ညီစေရန် အနည်းဆုံး ၁ လုံးစီ မဖြစ်မနေ ထည့်သွင်းခြင်း
        password.append(UPPER.charAt(random.nextInt(UPPER.length())));
        password.append(LOWER.charAt(random.nextInt(LOWER.length())));
        password.append(DIGITS.charAt(random.nextInt(DIGITS.length())));
        password.append(SPECIAL.charAt(random.nextInt(SPECIAL.length())));

        // ကျန်ရှိသော ၄ လုံးကို စုစုပေါင်း အလုံးရေ ၈ လုံး ပြည့်အောင် Random ရွေးချယ်ခြင်း
        for (int i = 4; i < 8; i++) {
            password.append(ALL_CHARS.charAt(random.nextInt(ALL_CHARS.length())));
        }

        // စာလုံးများကို နေရာစုံအောင် မွှေနှောက် (Shuffle) ခြင်း
        char[] array = password.toString().toCharArray();
        for (int i = array.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }

        return new String(array);
    }
}