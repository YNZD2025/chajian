package com.nian.yinianzhida.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * SpringDoc OpenAPI 配置类
 * 用于生成 Swagger 文档
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("一念职达 (ApplyMind) API 文档")
                        .version("1.0.0")
                        .description("""
                                一念职达是一个基于AI的智能求职辅助平台。

                                主要功能：
                                - AI对话与问答
                                - 简历智能解析与分析
                                - 职位推荐
                                - 职业发展策略
                                """)
                        .contact(new Contact()
                                .name("一念职达团队")
                                .email("support@applymind.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0.html")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("本地开发环境"),
                        new Server()
                                .url("https://api.applymind.com")
                                .description("生产环境")
                ));
    }
}
