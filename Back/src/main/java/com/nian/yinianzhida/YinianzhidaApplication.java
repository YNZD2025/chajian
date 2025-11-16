package com.nian.yinianzhida;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;

@SpringBootApplication
public class YinianzhidaApplication {

    public static void main(String[] args) {
        ApplicationContext context = SpringApplication.run(YinianzhidaApplication.class, args);

        System.out.println("\n========================================");
        System.out.println("Application started successfully!");
        System.out.println("Available endpoints:");
        System.out.println("  - http://localhost:8080/");
        System.out.println("\nAuthentication:");
        System.out.println("  - POST http://localhost:8080/auth/wechat/qrcode-scene (生成登录二维码)");
        System.out.println("  - GET  http://localhost:8080/auth/wechat/login-status/{sceneId} (查询登录状态)");
        System.out.println("\nResume Analysis V2:");
        System.out.println("  - POST http://localhost:8080/resume/v2/extract-text (快速提取文本 ~2秒)");
        System.out.println("  - POST http://localhost:8080/resume/v2/parse-json/{taskId} (AI解析JSON ~15秒)");
        System.out.println("  - POST http://localhost:8080/resume/v2/upload-and-parse (一键完成全流程)");
        System.out.println("\nAI Chat:");
        System.out.println("  - POST http://localhost:8080/chat/session (获取或创建会话)");
        System.out.println("  - POST http://localhost:8080/chat/message (发送消息)");
        System.out.println("  - GET  http://localhost:8080/chat/history/{sessionId} (获取历史消息)");
        System.out.println("  - GET  http://localhost:8080/chat/preset-questions (获取预设问题)");
        System.out.println("\nSwagger API Documentation:");
        System.out.println("  - http://localhost:8080/swagger-ui.html");
        System.out.println("========================================\n");
    }

}
