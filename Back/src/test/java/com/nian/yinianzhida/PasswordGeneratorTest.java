package com.nian.yinianzhida;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 密码生成工具类
 * 用于生成BCrypt加密后的密码
 */
public class PasswordGeneratorTest {

    @Test
    public void generatePasswords() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // 生成 admin123 的加密密码
        String adminPassword = encoder.encode("admin123");
        System.out.println("admin123 加密后的密码：");
        System.out.println(adminPassword);
        System.out.println();

        // 生成 test123 的加密密码
        String testPassword = encoder.encode("test123");
        System.out.println("test123 加密后的密码：");
        System.out.println(testPassword);
        System.out.println();

        // 验证密码是否正确
        System.out.println("验证 admin123：" + encoder.matches("admin123", adminPassword));
        System.out.println("验证 test123：" + encoder.matches("test123", testPassword));
    }
}
